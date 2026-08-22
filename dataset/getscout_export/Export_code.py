#!/usr/bin/env python
# coding: utf-8

# In[ ]:


# =========================
# EXPORT HELPERS
# =========================
def get_position_component_cols(position):
    return POSITION_COMPONENT_MAP.get(position, [])

def get_position_target_avg_cols(position):
    return [_target_avg_col_from_component(c) for c in POSITION_COMPONENT_MAP.get(position, [])]

def get_position_delta_cols(position):
    return [_delta_col_from_component(c) for c in POSITION_COMPONENT_MAP.get(position, [])]

def get_export_columns_for_position(shortlist_df, position):
    base_cols = [
        "Player", "Team", "League", "Season", "Position",
        "Age", "Minutes", "Height", "TM_Market value", "TM_Market_Value_Numeric", "Contract", "On loan", "Age Fit", "MV Fit", "Squad Role",

        "Performance Score", "Compatibility Score", "Financial Score", "Recommendation", "Transfer Probability %",

        "Upgrade Level", "Biggest Upgrade Area",
        "Player Impact", "Impact Delta vs Team Avg", "Impact Delta vs Best Player", "Impact Delta vs Weakest Player",
        "Positive Delta vs Team Avg", "Negative Delta vs Team Avg",

        "Perf vs Team %", "Perf vs Own League %", "Perf vs TargetLeague %",

        "Role Fit Score", "Best Team Fit Role", "Similarity To Target Player %",
        "Most Similar Target Player", "Matched Role Slot",
        "BestRole", "Role %", "TopRoles", "RoleMatches",
        "Top Team Fit Roles", "Top Team Demanded Roles", "Player Top Roles Detailed",
        "Second Similar Target Player", "Second Similarity %", "Top Target Player Similarities",

        "Contract Fit %", "Hist Country Match",

        "Player Score", "Score",

        "Player Impact Raw", "Player Impact Positive", "Player Impact Negative", "Impact Reliability",

        "Target Team", "Target Position",
        "Target Team Pos Avg Impact", "Target Team Best Impact", "Target Team Weakest Impact",
        "Target Team Pos Avg Positive", "Target Team Pos Avg Negative", "Target Team Pos Player Count",

        "Target_Club", "Target_League",
        "TM_Agent name", "TM_Agent link", "TM_Agent total market value", "TM_Player URL"
    ]

    pos_component_cols = get_position_component_cols(position)
    pos_target_avg_cols = get_position_target_avg_cols(position)
    pos_delta_cols = get_position_delta_cols(position)

    export_cols = [c for c in base_cols if c in shortlist_df.columns]
    export_cols += [c for c in pos_component_cols if c in shortlist_df.columns]
    export_cols += [c for c in pos_target_avg_cols if c in shortlist_df.columns]
    export_cols += [c for c in pos_delta_cols if c in shortlist_df.columns]

    return export_cols


# =========================
# EXPORT FUNCTION
# =========================
def export_team_shortlist_xlsx(
    df,
    target_team,
    season,
    age_min=18, age_max=40,
    mv_min=0, mv_max=200_000_000,
    perf_threshold=50.0,
    top_n=20,
    export_path="team_shortlist.xlsx",
    verbose=True,
    MIN_MINUTES_FOR_AVG=0,
    transfers_df=None,
    club_country_map=None,
    league_weights=None,
    squad_roles=None,
    contract_fit_levels=None,
    scouting_lookback=3,
    team_styles_df=None,
    target_team_min_player_minutes=300,
    similarity_role_weight=0.7,
    similarity_component_weight=0.3,
    include_similarity=True
):
    df = _rename_columns_safe(df)
    df = prepare_optional_transfer_fields(df)

    if "League" in df.columns:
        df["League"] = df["League"].apply(normalize_league_name)

    norm_league_weights = normalize_league_weights(league_weights or {})
    writer = pd.ExcelWriter(export_path, engine="openpyxl")

    # =========================
    # SUMMARY SHEET
    # =========================
    if verbose:
        print("📊 Generating Summary sheet...")

    # CURRENT SEASON ONLY
    club_df = df[
        (df["Team"].astype(str).str.strip() == str(target_team).strip()) &
        (df["Season"].astype(str).str.strip() == str(season).strip())
    ].copy()

    if "Minutes" not in club_df.columns:
        for alt in ["Minutes played", "Mins played", "Time Played"]:
            if alt in club_df.columns:
                club_df["Minutes"] = club_df[alt]
                break

    if "Minutes" not in club_df.columns:
        club_df["Minutes"] = 0

    def classify_squad_role(ratio):
        if ratio >= 0.8:
            return "Important Player"
        elif ratio >= 0.6:
            return "Regular Starter"
        elif ratio >= 0.3:
            return "Squad Player"
        elif ratio >= 0.1:
            return "Fringe Player"
        return "Out-of-Favour"

    if not club_df.empty:
        avg_minutes = max(club_df["Minutes"].mean(), 1)
        club_df["Minutes_Ratio"] = club_df["Minutes"] / avg_minutes
        club_df["Squad Role"] = club_df["Minutes_Ratio"].apply(classify_squad_role)

    if "Player_Score" not in club_df.columns:
        club_df["Player_Score"] = None

    # contract column
    if "Contract expires" in club_df.columns:
        club_df["Contract"] = club_df["Contract expires"]
    elif "Contract" not in club_df.columns:
        club_df["Contract"] = None

    def classify_contract_status(contract_value):
        if pd.isna(contract_value):
            return "Unknown"

        txt = str(contract_value).strip()

        if txt == "" or txt.lower() in ["nan", "none", "unknown", "-", "no data"]:
            return "Unknown"

        dt = pd.to_datetime(txt, errors="coerce", dayfirst=True)
        if pd.notna(dt):
            days_left = (dt.normalize() - pd.Timestamp.today().normalize()).days
            if days_left < 0:
                return "Expired"
            elif days_left <= 365:
                return "Expiring <=12m"
            elif days_left <= 730:
                return "Expiring 12-24m"
            return "Long Deal"

        import re
        year_match = re.search(r"(20\d{2})", txt)
        if year_match:
            year_num = int(year_match.group(1))
            current_year = pd.Timestamp.today().year
            diff = year_num - current_year

            if diff < 0:
                return "Expired"
            elif diff <= 1:
                return "Expiring <=12m"
            elif diff <= 2:
                return "Expiring 12-24m"
            return "Long Deal"

        return txt

    club_df["Contract Status"] = club_df["Contract"].apply(classify_contract_status)

    summary_data = {"Club": target_team, "Season": season}
    avg_age_perm = avg_mv_perm = avg_fee_perm = np.nan
    avg_age_loan = avg_mv_loan = avg_fee_loan = np.nan
    count_perm = count_loan = 0
    target_league = None

    if transfers_df is not None and not transfers_df.empty:
        all_arrivals, clean_arrivals, perm, loans = club_transfer_profile(
            transfers_df=transfers_df,
            club_name=target_team,
            last_n_years=5
        )

        if not perm.empty:
            count_perm = len(perm)
            avg_age_perm = perm["Age"].mean() if "Age" in perm.columns else np.nan
            avg_mv_perm = perm["Market_Value"].mean() if "Market_Value" in perm.columns else np.nan
            avg_fee_perm = perm["Fee"].mean() if "Fee" in perm.columns else np.nan

            if target_league is None and "League" in perm.columns and not perm["League"].isna().all():
                target_league = perm["League"].iloc[0]

        if not loans.empty:
            count_loan = len(loans)
            avg_age_loan = loans["Age"].mean() if "Age" in loans.columns else np.nan
            avg_mv_loan = loans["Market_Value"].mean() if "Market_Value" in loans.columns else np.nan
            avg_fee_loan = loans["Fee"].mean() if "Fee" in loans.columns else np.nan

            if target_league is None and "League" in loans.columns and not loans["League"].isna().all():
                target_league = loans["League"].iloc[0]

    if not club_df.empty and target_league is None and "League" in club_df.columns:
        target_league = club_df["League"].iloc[0]

    summary_data["League"] = target_league
    summary_data.update({
        "Permanent Arrivals Count": count_perm,
        "Avg Age (Permanent)": round(avg_age_perm, 2) if pd.notna(avg_age_perm) else None,
        "Avg MV (Permanent)": format_financial(avg_mv_perm, "€") if pd.notna(avg_mv_perm) else None,
        "Avg Fee (Permanent)": format_financial(avg_fee_perm, "€") if pd.notna(avg_fee_perm) else None,
        "Loan Arrivals Count": count_loan,
        "Avg Age (Loans)": round(avg_age_loan, 2) if pd.notna(avg_age_loan) else None,
        "Avg MV (Loans)": format_financial(avg_mv_loan, "€") if pd.notna(avg_mv_loan) else None,
        "Avg Loan Fee": format_financial(avg_fee_loan, "€") if pd.notna(avg_fee_loan) else None,
        "Squad Players Count": len(club_df)
    })

    pd.DataFrame([summary_data]).to_excel(writer, index=False, sheet_name="Summary", startrow=0)

    # squad table
    squad_cols = [
        "Player",
        "Main_Position",
        "Age",
        "Minutes",
        "Squad Role",
        "Contract",
        "Contract Status",
        "Market value_TM",
        "Player_Score",
        "Player Impact",
        "On loan"
    ]
    squad_cols = [col for col in squad_cols if col in club_df.columns]

    if squad_cols:
        club_df[squad_cols].sort_values("Minutes", ascending=False).to_excel(
            writer, index=False, sheet_name="Summary", startrow=24
        )

    # country profile
    if transfers_df is not None and not transfers_df.empty:
        _, clean_arrivals, _, _ = club_transfer_profile(
            transfers_df=transfers_df,
            club_name=target_team,
            last_n_years=5
        )

        t = clean_arrivals.copy()

        if "Dealing_Country" not in t.columns or t["Dealing_Country"].isna().all():
            if club_country_map and "Dealing_Club" in t.columns:
                t["Dealing_Country"] = t["Dealing_Club"].map(club_country_map)

        t = t.dropna(subset=["Dealing_Country"]) if "Dealing_Country" in t.columns else t.iloc[0:0]

        if verbose:
            print("✅ Clean incoming transfers for club:", len(t))

        country_stats = (
            t.groupby("Dealing_Country")
            .size()
            .reset_index(name="Num_Transfers")
            .sort_values("Num_Transfers", ascending=False)
        )

        if not country_stats.empty:
            total = country_stats["Num_Transfers"].sum()
            country_stats["Weight %"] = (country_stats["Num_Transfers"] / total * 100).round(2)
            country_stats.to_excel(writer, index=False, sheet_name="Summary", startrow=2)

    # =========================
    # POSITION SHEETS
    # =========================
    positions = ["GK", "CB", "LB", "RB", "CM", "DMF", "AMF", "LW", "RW", "CF"]
    all_shortlists = []

    for pos in positions:
        if verbose:
            print(f"🔎 Processing position: {pos}")

        shortlist = external_target_shortlist_absolute_vectorized(
            df=df,
            target_team=target_team,
            season=season,
            perf_threshold=perf_threshold,
            position_filter=pos,
            SEASONS_LOOKBACK=scouting_lookback,
            MIN_MINUTES_FOR_AVG=MIN_MINUTES_FOR_AVG,
            age_min=age_min,
            age_max=age_max,
            mv_min=mv_min,
            mv_max=mv_max,
            top_n=top_n,
            league_weights=norm_league_weights,
            apply_weights_to_composite=False,
            transfers_df=transfers_df,
            club_country_map=club_country_map,
            verbose=False,
            team_styles_df=team_styles_df,
            target_team_min_player_minutes=target_team_min_player_minutes,
            similarity_role_weight=similarity_role_weight,
            similarity_component_weight=similarity_component_weight,
            include_similarity=include_similarity
        )

        if not shortlist.empty:
            if contract_fit_levels:
                shortlist = shortlist[
                    shortlist["Contract Fit %"].apply(lambda x: round(x / 100, 1)).isin(contract_fit_levels)
                ]
            if squad_roles:
                shortlist = shortlist[shortlist["Squad Role"].isin(squad_roles)]

            if not shortlist.empty:
                export_cols = get_export_columns_for_position(shortlist, pos)
                shortlist_export = shortlist[export_cols].copy()
                shortlist_export.to_excel(writer, sheet_name=pos, index=False)
                all_shortlists.append(shortlist_export)

    writer.close()

    if verbose:
        print(f"✅ Export complete for {target_team} ({season}) → {export_path}")

    return pd.concat(all_shortlists).reset_index(drop=True) if all_shortlists else pd.DataFrame()


# In[ ]:


# =========================
# Clubs Summary Shortlist Input
# =========================
import pandas as pd
import numpy as np

def get_club_transfer_summary_table(clubs, transfers_df, players_df=None, season=None):
    rows = []

    for club in clubs:
        avg_age_perm = avg_mv_perm = avg_fee_perm = np.nan
        avg_age_loan = avg_mv_loan = avg_fee_loan = np.nan
        max_mv_perm = max_fee_perm = np.nan
        max_mv_loan = max_fee_loan = np.nan
        count_perm = count_loan = 0
        league = None
        squad_count = None

        top_country_1 = None
        top_country_2 = None
        top_country_3 = None
        top_3_countries = None
        all_shopping_countries = None

        try:
            all_arrivals, clean_arrivals, perm, loans = club_transfer_profile(
                transfers_df=transfers_df,
                club_name=club,
                last_n_years=3
            )

            if not perm.empty:
                count_perm = len(perm)
                avg_age_perm = perm["Age"].mean() if "Age" in perm.columns else np.nan
                avg_mv_perm = perm["Market_Value"].mean() if "Market_Value" in perm.columns else np.nan
                avg_fee_perm = perm["Fee"].mean() if "Fee" in perm.columns else np.nan
                max_mv_perm = perm["Market_Value"].max() if "Market_Value" in perm.columns else np.nan
                max_fee_perm = perm["Fee"].max() if "Fee" in perm.columns else np.nan

                if "League" in perm.columns and not perm["League"].isna().all():
                    league = perm["League"].iloc[0]

            if not loans.empty:
                count_loan = len(loans)
                avg_age_loan = loans["Age"].mean() if "Age" in loans.columns else np.nan
                avg_mv_loan = loans["Market_Value"].mean() if "Market_Value" in loans.columns else np.nan
                avg_fee_loan = loans["Fee"].mean() if "Fee" in loans.columns else np.nan
                max_mv_loan = loans["Market_Value"].max() if "Market_Value" in loans.columns else np.nan
                max_fee_loan = loans["Fee"].max() if "Fee" in loans.columns else np.nan

                if league is None and "League" in loans.columns and not loans["League"].isna().all():
                    league = loans["League"].iloc[0]

            if not clean_arrivals.empty and "Dealing_Country" in clean_arrivals.columns:
                country_stats = (
                    clean_arrivals.dropna(subset=["Dealing_Country"])
                    .groupby("Dealing_Country")
                    .size()
                    .reset_index(name="Num_Transfers")
                    .sort_values("Num_Transfers", ascending=False)
                )

                if not country_stats.empty:
                    countries = country_stats["Dealing_Country"].astype(str).tolist()
                    top_country_1 = countries[0] if len(countries) > 0 else None
                    top_country_2 = countries[1] if len(countries) > 1 else None
                    top_country_3 = countries[2] if len(countries) > 2 else None
                    top_3_countries = ", ".join(countries[:3])
                    all_shopping_countries = ", ".join(countries)

        except Exception as e:
            print(f"Error on {club}: {e}")

        if players_df is not None and season is not None:
            club_df = players_df[
                (players_df["Team"].astype(str).str.strip() == str(club).strip()) &
                (players_df["Season"].astype(str).str.strip() == str(season).strip())
            ].copy()

            squad_count = len(club_df)

            if league is None and not club_df.empty and "League" in club_df.columns:
                league = club_df["League"].iloc[0]

        rows.append({
            "Club": club,
            "League": league,
            "Permanent Arrivals Count": count_perm,
            "Avg Age (Permanent)": round(avg_age_perm, 2) if pd.notna(avg_age_perm) else None,
            "Avg MV (Permanent)": avg_mv_perm if pd.notna(avg_mv_perm) else None,
            "Max MV (Permanent)": max_mv_perm if pd.notna(max_mv_perm) else None,
            "Avg Fee (Permanent)": avg_fee_perm if pd.notna(avg_fee_perm) else None,
            "Max Fee (Permanent)": max_fee_perm if pd.notna(max_fee_perm) else None,
            "Loan Arrivals Count": count_loan,
            "Avg Age (Loans)": round(avg_age_loan, 2) if pd.notna(avg_age_loan) else None,
            "Avg MV (Loans)": avg_mv_loan if pd.notna(avg_mv_loan) else None,
            "Max MV (Loans)": max_mv_loan if pd.notna(max_mv_loan) else None,
            "Avg Loan Fee": avg_fee_loan if pd.notna(avg_fee_loan) else None,
            "Max Loan Fee": max_fee_loan if pd.notna(max_fee_loan) else None,
            "Squad Players Count": squad_count,
            "Top Country 1": top_country_1,
            "Top Country 2": top_country_2,
            "Top Country 3": top_country_3,
            "Top 3 Countries": top_3_countries,
            "All Shopping Countries": all_shopping_countries
        })

    return pd.DataFrame(rows)


def round_money(x, base=500_000, min_value=0):
    if pd.isna(x):
        return None
    x = max(min_value, x)
    return int(base * round(float(x) / base))


def format_financial_num(value, currency="€"):
    if value is None or pd.isna(value):
        return None
    value = float(value)
    if abs(value) >= 1_000_000_000:
        return f"{currency}{value/1_000_000_000:.1f}bn"
    elif abs(value) >= 1_000_000:
        return f"{currency}{value/1_000_000:.1f}m"
    elif abs(value) >= 1_000:
        return f"{currency}{value/1_000:.0f}k"
    return f"{currency}{value:.0f}"


def build_shortlist_input_recommendations(summary_df):
    rows = []

    for _, row in summary_df.iterrows():
        club = row["Club"]
        league = row.get("League")

        perm_count = row.get("Permanent Arrivals Count", 0) or 0
        loan_count = row.get("Loan Arrivals Count", 0) or 0

        avg_age_perm = row.get("Avg Age (Permanent)")
        avg_mv_perm = row.get("Avg MV (Permanent)")
        max_mv_perm = row.get("Max MV (Permanent)")
        avg_fee_perm = row.get("Avg Fee (Permanent)")
        max_fee_perm = row.get("Max Fee (Permanent)")

        avg_age_loan = row.get("Avg Age (Loans)")
        avg_mv_loan = row.get("Avg MV (Loans)")
        max_mv_loan = row.get("Max MV (Loans)")
        avg_loan_fee = row.get("Avg Loan Fee")
        max_loan_fee = row.get("Max Loan Fee")

        top_country_1 = row.get("Top Country 1")
        top_country_2 = row.get("Top Country 2")
        top_country_3 = row.get("Top Country 3")
        top_3_countries = row.get("Top 3 Countries")
        all_shopping_countries = row.get("All Shopping Countries")

        mv_anchor = avg_mv_perm
        if pd.isna(mv_anchor):
            mv_anchor = avg_fee_perm
        if pd.isna(mv_anchor):
            mv_anchor = avg_mv_loan

        age_anchor = avg_age_perm
        if pd.isna(age_anchor):
            age_anchor = avg_age_loan

        suggested_age_min = 18
        suggested_age_max = 28
        suggested_mv_min = 0
        suggested_mv_max = 20_000_000

        if pd.notna(age_anchor):
            suggested_age_min = max(17, int(np.floor(age_anchor - 3)))
            suggested_age_max = min(35, int(np.ceil(age_anchor + 3)))

        if pd.notna(mv_anchor):
            suggested_mv_min = round_money(mv_anchor * 0.5, base=500_000, min_value=0)
            suggested_mv_max = round_money(mv_anchor * 1.5, base=500_000, min_value=500_000)

        suggested_fee_min = None
        suggested_fee_max = None
        if pd.notna(avg_fee_perm):
            suggested_fee_min = round_money(avg_fee_perm * 0.5, base=500_000, min_value=0)
            suggested_fee_max = round_money(avg_fee_perm * 1.5, base=500_000, min_value=500_000)

        total_incomings = perm_count + loan_count
        loan_ratio = (loan_count / total_incomings) if total_incomings > 0 else 0

        if loan_ratio >= 0.5:
            loan_focus = "High"
            note = "Loan-heavy profile; include fringe players, expiring deals, loan targets."
        elif loan_ratio >= 0.3:
            loan_focus = "Medium"
            note = "Blend permanent and loan targets."
        else:
            loan_focus = "Low"
            note = "Permanent-focused profile."

        if pd.notna(mv_anchor):
            if mv_anchor <= 3_000_000:
                market_tier = "Low budget"
            elif mv_anchor <= 10_000_000:
                market_tier = "Mid-low budget"
            elif mv_anchor <= 20_000_000:
                market_tier = "Mid budget"
            else:
                market_tier = "Upper budget"
        else:
            market_tier = "Unknown"

        rows.append({
            "Club": club,
            "League": league,
            "Market Tier": market_tier,
            "Loan Focus": loan_focus,
            "Suggested Age Min": suggested_age_min,
            "Suggested Age Max": suggested_age_max,
            "Suggested MV Min": suggested_mv_min,
            "Suggested MV Max": suggested_mv_max,
            "Suggested MV Min (Formatted)": format_financial_num(suggested_mv_min),
            "Suggested MV Max (Formatted)": format_financial_num(suggested_mv_max),
            "Suggested Fee Min": suggested_fee_min,
            "Suggested Fee Max": suggested_fee_max,
            "Suggested Fee Min (Formatted)": format_financial_num(suggested_fee_min) if suggested_fee_min is not None else None,
            "Suggested Fee Max (Formatted)": format_financial_num(suggested_fee_max) if suggested_fee_max is not None else None,

            "Avg Age (Permanent)": avg_age_perm,
            "Avg MV (Permanent)": format_financial_num(avg_mv_perm) if pd.notna(avg_mv_perm) else None,
            "Max MV (Permanent)": format_financial_num(max_mv_perm) if pd.notna(max_mv_perm) else None,
            "Avg Fee (Permanent)": format_financial_num(avg_fee_perm) if pd.notna(avg_fee_perm) else None,
            "Max Fee (Permanent)": format_financial_num(max_fee_perm) if pd.notna(max_fee_perm) else None,

            "Avg Age (Loans)": avg_age_loan,
            "Avg MV (Loans)": format_financial_num(avg_mv_loan) if pd.notna(avg_mv_loan) else None,
            "Max MV (Loans)": format_financial_num(max_mv_loan) if pd.notna(max_mv_loan) else None,
            "Avg Loan Fee": format_financial_num(avg_loan_fee) if pd.notna(avg_loan_fee) else None,
            "Max Loan Fee": format_financial_num(max_loan_fee) if pd.notna(max_loan_fee) else None,

            "Permanent Arrivals Count": perm_count,
            "Loan Arrivals Count": loan_count,
            "Top Country 1": top_country_1,
            "Top Country 2": top_country_2,
            "Top Country 3": top_country_3,
            "Top 3 Countries": top_3_countries,
            "All Shopping Countries": all_shopping_countries,
            "Search Note": note
        })

    return pd.DataFrame(rows)


# In[ ]:


import pandas as pd
import numpy as np
import re
import unicodedata

# =========================
# LOAD DATA
# =========================
players_df = pd.read_excel(
    r"Data_merge\wyscout_with_TM_data.xlsx"
)
transfers_df = pd.read_excel(
    r"transfermarkt_scraper\player_transfer_data.xlsx"
)
team_styles_df = pd.read_excel(r"Combined_Team_Stats.xlsx")

# =========================
# POSITION METRICS
# =========================
POSITION_METRICS = {
    "GK": [
        "Save rate, %", "Shots against per 90", "xG against per 90",
        "Conceded goals per 90", "Exits per 90", "Aerial duels per 90",
        "Accurate forward passes, %", "Clean sheets"
    ],
    "CB": [
        "Shots blocked per 90", "Interceptions per 90", "Successful defensive actions per 90",
        "Forward passes per 90", "Aerial duels per 90",
        "Accurate passes, %", "Short / medium passes per 90", "Lateral passes per 90",
        "Long passes per 90"
    ],
    "RB": [
        "Crosses from right flank per 90", "Crosses per 90", "Deep completed crosses per 90",
        "Defensive duels per 90", "Received long passes per 90", "Successful defensive actions per 90",
        "Progressive passes per 90", "Forward passes per 90", "Interceptions per 90",
        "Passes to penalty area per 90", "Assists", "Goals"
    ],
    "LB": [
        "Crosses from left flank per 90", "Crosses per 90", "Deep completed crosses per 90",
        "Defensive duels per 90", "Received long passes per 90", "Successful defensive actions per 90",
        "Progressive passes per 90", "Forward passes per 90", "Interceptions per 90",
        "Passes to penalty area per 90", "Assists", "Goals"
    ],
    "DMF": [
        "Passes to final third per 90", "Short / medium passes per 90", "Successful defensive actions per 90",
        "Defensive duels per 90", "Duels won, %", "Interceptions per 90",
        "Sliding tackles per 90", "Passes per 90", "Accurate passes, %",
        "Accurate progressive passes, %", "Received passes per 90", "PAdj Interceptions",
        "Assists", "Through passes per 90"
    ],
    "CM": [
        "Defensive duels per 90", "Back passes per 90", "Passes per 90",
        "Fouls per 90", "Sliding tackles per 90", "Successful defensive actions per 90",
        "Duels per 90", "Through passes per 90", "Short / medium passes per 90",
        "Accurate passes, %", "Accurate passes to final third, %",
        "Accurate passes to penalty area, %", "Passes to final third per 90",
        "Goals", "Assists"
    ],
    "AMF": [
        "Smart passes per 90", "Shot assists per 90", "Deep completions per 90", "xA per 90",
        "Shots per 90", "Passes to penalty area per 90", "Through passes per 90",
        "Key passes per 90", "Goals", "xG per 90", "Assists", "Assists per 90"
    ],
    "RW": [
        "Crosses from right flank per 90", "Dribbles per 90", "Successful dribbles, %",
        "Successful attacking actions per 90", "Offensive duels per 90",
        "Crosses per 90", "Accelerations per 90", "Progressive runs per 90",
        "Deep completed crosses per 90", "Crosses to goalie box per 90",
        "Key passes per 90", "Shots per 90", "Shot assists per 90",
        "Accurate passes to penalty area, %", "xG per 90", "Goals", "xA per 90", "Assists"
    ],
    "LW": [
        "Crosses from left flank per 90", "Dribbles per 90", "Successful dribbles, %",
        "Successful attacking actions per 90", "Offensive duels per 90",
        "Crosses per 90", "Accelerations per 90", "Progressive runs per 90",
        "Deep completed crosses per 90", "Crosses to goalie box per 90",
        "Key passes per 90", "Shots per 90", "Shot assists per 90",
        "Accurate passes to penalty area, %", "xG per 90", "Goals", "xA per 90", "Assists"
    ],
    "CF": [
        "Goals", "xG per 90", "Touches in box per 90", "Shots per 90",
        "Goals per 90", "Aerial duels per 90", "Shots on target, %",
        "Offensive duels per 90", "Received long passes per 90",
        "Fouls suffered per 90", "Fouls per 90", "Assists per 90", "Duels per 90"
    ]
}


# =========================
# ROLE FEATURES
# =========================
ROLE_COLUMNS_BY_POSITION = {
    "CF": [
        "Deep-Lying Forward",
        "Target Forward",
        "Poacher",
        "Complete Forward",
        "Advanced Forward",
        "Pressing Forward",
        "Trequartista"
    ],
    "AMF": [
        "Shadow Striker",
        "Advanced Playmaker",
        "Enganche",
        "Trequartista"
    ],
    "CM": [
        "Box-To-Box Midfielder",
        "Carrilero",
        "Ball Winning Midfielder (Defend)",
        "Central Midfielder (Support)",
        "Advanced Playmaker (Attack)",
        "Advanced Playmaker (Support)",
        "Mezzala"
    ],
    "DMF": [
        "Regista",
        "Deep Lying Playmaker",
        "Half Back",
        "Anchor",
        "Segundo Volante",
        "Ball Winning Midfielder",
        "Roaming Playmaker"
    ],
    "CB": [
        "Wide Centre-Back (LCB)",
        "No-Nonsense Centre-Back",
        "Ball Playing Defender",
        "Wide Centre-Back (RCB)",
        "Libero"
    ],
    "LB": [
        "No-Nonsense Full-Back",
        "Full-Back",
        "Complete Wing-Back",
        "Wing-Back",
        "Inverted Wing-Back",
        "Inverted Full-Back"
    ],
    "RB": [
        "Full-Back",
        "Complete Wing-Back",
        "Wing-Back",
        "Inverted Full-Back",
        "Inverted Wing-Back",
        "No-Nonsense Full-Back"
    ],
    "RW": [
        "Winger (Support)",
        "Inverted Winger",
        "Advanced Playmaker (Attack)",
        "Inside Forward",
        "Winger (Defend)",
        "Advanced Playmaker (Support)"
    ],
    "LW": [
        "Advanced Playmaker (Support)",
        "Winger (Support)",
        "Winger (Defend)",
        "Inverted Winger",
        "Advanced Playmaker (Attack)",
        "Trequartista (Support)",
        "Inside Forward (Attack)"
    ],
    "GK": [
        "Goalkeeper (Defend)",
        "Sweeper Keeper (Balanced)",
        "Sweeper Keeper (Build-Up)",
        "Goalkeeper (Ball-Playing)"
    ]
}

# =========================
# POSITION NORMALISATION
# =========================
POSITION_NORMALISATION = {
    "Centre-Back": "CB", "Center Back": "CB", "Central Defender": "CB",
    "Left Centre-Back": "CB", "Right Centre-Back": "CB",
    "LCB": "CB", "RCB": "CB", "CB": "CB",

    "Right Back": "RB", "Fullback Right": "RB", "RB": "RB",
    "Right Full-Back": "RB", "RFB": "RB", "Right Wing-Back": "RB", "RWB": "RB",

    "Left Back": "LB", "Fullback Left": "LB", "LB": "LB",
    "Left Full-Back": "LB", "LFB": "LB", "Left Wing-Back": "LB", "LWB": "LB",

    "Defensive Midfield": "DMF", "CDM": "DMF", "DM": "DMF",
    "LDMF": "DMF", "RDMF": "DMF", "DMF": "DMF",

    "Central Midfield": "CM", "CMF": "CM", "Midfielder Centre": "CM",
    "LCMF": "CM", "RCMF": "CM", "CM": "CM",

    "Attacking Midfield": "AMF", "CAM": "AMF",
    "LAMF": "AMF", "RAMF": "AMF", "AMF": "AMF",

    "Right Midfield": "RW", "Right Winger": "RW", "Right Wing": "RW",
    "Right Forward": "RW", "RW": "RW", "RWF": "RW",

    "Left Midfield": "LW", "Left Winger": "LW", "Left Wing": "LW",
    "Left Forward": "LW", "LW": "LW", "LWF": "LW",

    "Centre Forward": "CF", "FWD": "CF", "Forward": "CF", "CF": "CF",
    "Goalkeeper": "GK", "Keeper": "GK", "GK": "GK"
}

def normalise_position(pos):
    if pd.isna(pos):
        return pos
    return POSITION_NORMALISATION.get(str(pos).strip(), str(pos).strip())

# =========================
# HELPERS
# =========================
def prepare_optional_transfer_fields(df):
    df = df.copy()

    # -------------------------
    # Market value fallback
    # FIX: was missing comma between "TM_Market value" and "TM_Market_Value_Numeric"
    # which caused Python to silently concatenate them into one invalid string
    # -------------------------
    mv_candidates = [
        "TM_Market value",          # <-- comma was missing here in original
        "TM_Market_Value_Numeric",
        "Market Value (TM)",
        "Market Value (Wyscout)",
        "Market value"
    ]

    mv_source = next((c for c in mv_candidates if c in df.columns), None)

    if mv_source is not None:
        if mv_source == "TM_Market_Value_Numeric":
            df["MV_num"] = pd.to_numeric(df[mv_source], errors="coerce")
        else:
            df["MV_num"] = pd.to_numeric(_parse_mv(df[mv_source]), errors="coerce")
    else:
        df["MV_num"] = np.nan

    # -------------------------
    # Contract fallback
    # -------------------------
    contract_candidates = ["Contract", "Contract expires"]
    contract_source = next((c for c in contract_candidates if c in df.columns), None)

    if contract_source is not None:
        df["Contract_Final"] = df[contract_source]
    else:
        df["Contract_Final"] = np.nan

    # -------------------------
    # Optional agent / url cols
    # -------------------------
    if "Agent name" not in df.columns:
        df["Agent name"] = ""
    if "Agent link" not in df.columns:
        df["Agent link"] = ""
    if "Agent total market value" not in df.columns:
        df["Agent total market value"] = ""
    if "Player URL" not in df.columns:
        df["Player URL"] = ""

    return df

def _pick(df, names, required=True):
    for n in names:
        if n in df.columns:
            return n
    if required:
        raise KeyError(f"Missing required col, tried: {names}")
    return None

def _parse_mv(series):
    def to_num(x):
        if pd.isna(x):
            return pd.NA
        t = str(x).lower().replace(",", "").replace("€", "").replace("£", "").strip()
        mult = 1
        if "bn" in t:
            mult = 1_000_000_000
            t = t.replace("bn", "").strip()
        elif t.endswith("m"):
            mult = 1_000_000
            t = t[:-1]
        elif t.endswith("k"):
            mult = 1_000
            t = t[:-1]
        try:
            return float(t) * mult
        except:
            return pd.NA
    return series.apply(to_num)

def _season_start_int(s):
    s = str(s).split("-")[0].split("/")[0]
    try:
        return int(s)
    except:
        return None

def classify_fit(value, avg, tol_great, tol_moderate):
    if pd.isna(value) or pd.isna(avg):
        return "Unknown"
    diff = abs(value - avg)
    if diff <= tol_great:
        return "Great Fit"
    elif diff <= tol_moderate:
        return "Moderate Fit"
    return "Poor Fit"

def show_players_by_position(df, position, max_rows=20):
    if "Main_Position" not in df.columns:
        raise KeyError("❌ 'Main_Position' column not found in dataframe")

    pos_players = df[df["Main_Position"] == position]
    if pos_players.empty:
        print(f"⚠️ No players found for position '{position}'.")
        return pd.DataFrame()

    cols_to_show = ["Player", "Team", "League", "Season", "Age", "Market value"]
    cols_available = [c for c in cols_to_show if c in pos_players.columns]

    print(f"✅ Found {len(pos_players)} players for position: {position}")
    print(pos_players[cols_available].head(max_rows))
    return pos_players

def get_role_scores_from_dataset(row, position):
    role_cols = ROLE_COLUMNS_BY_POSITION.get(position, [])
    scores = {role: float(row.get(role, 0)) for role in role_cols if role in row.index}

    if not scores:
        return None, 0, {}, []

    sorted_roles = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_role, top_score = sorted_roles[0]
    top_roles = [r for r, _ in sorted_roles[:3]]
    return top_role, top_score, scores, top_roles

def get_player_profile(shortlist, player_name):
    player_row = shortlist[shortlist["Player"] == player_name]
    if player_row.empty:
        print(f"❌ Player '{player_name}' not found in shortlist")
        return None

    p = player_row.iloc[0]
    print("===================================")
    print(f" Player:        {p['Player']}")
    print(f" Team:          {p['Team']}")
    print(f" League:        {p['League']}")
    print(f" Season:        {p['Season']}")
    print("-----------------------------------")
    print(f" Age:           {p['Age']}")
    print(f" Market Value:  {p['Market value']}")
    print(f" Age Fit:       {p['Age Fit']}")
    print(f" MV Fit:        {p['MV Fit']}")
    print("-----------------------------------")
    print(f" Position:      {p['Position']}")
    print(f" Best Role:     {p['BestRole']}")
    print(f" Top Roles:     {p['TopRoles']}")
    print(f" Role Matches:  {p['RoleMatches']}")
    print("-----------------------------------")
    print(f" Score:         {p['Score']}")
    print(f" Composite:     {p['Composite Score']}")
    print(f" Perf vs Team:  {p['Perf vs Team %']}%")
    print(f" Perf vs League:{p['Perf vs TargetLeague %']}%")
    print(f" Player Impact: {p.get('Player Impact', '')}")
    print("===================================")
    return player_row

# =========================
# LEAGUE / COUNTRY NORMALIZATION
# =========================
def normalize_text(s: str) -> str:
    if pd.isna(s):
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

LEAGUE_ALIASES = {
    "primeira lig (portugal)": "Primeira Liga (Portugal)",
    "seria a (brazil)": "Serie A (Brazil)",
    "eredvisie (netherlands)": "Eredivisie (Netherlands)",
    "championship (enaglnd)": "Championship (England)",
    "league 1 (enaglnd)": "EFL League One (England)",
    "league 2 (enaglnd)": "EFL League Two (England)",
    "super league(switzerland)": "Super League (Switzerland)",
    "primera divsion (costa rica)": "Primera División (Costa Rica)",
    "divison profesional (paraguay)": "Division Profesional (Paraguay)",
}

TRANSFERMARKT_TO_PLAYER_LEAGUES = {
    "premier-league": "Premier League (England)",
    "championship": "Championship (England)",
    "league-one": "EFL League One (England)",
    "league-two": "EFL League Two (England)",
    "laliga": "La Liga (Spain)",
    "laliga2": "Segunda Division (Spain)",
    "serie-a": "Serie A (Italy)",
    "serie-b": "Serie B (Italy)",
    "ligue-1": "Ligue 1 (France)",
    "ligue-2": "Ligue 2 (France)",
    "bundesliga": "Bundesliga (Germany)",
    "2-bundesliga": "2. Bundesliga (Germany)",
    "superligaen": "Superliga (Denmark)",
    "allsvenskan": "Allsvenskan (Sweden)",
    "superettan": "Superettan (Sweden)",
    "eredivisie": "Eredivisie (Netherlands)",
    "keuken-kampioen-divisie": "Eerste Divisie (Netherlands)",
    "liga-nos": "Primeira Liga (Portugal)",
    "liga-portugal-2": "Segunda Liga (Portugal)",
    "jupiler-pro-league": "Pro League (Belgium)",
    "proximus-league": "Challenger Pro League (Belgium)",
    "superliga": "Super Liga (Serbia)",
    "nordicbet-liga": "1.Divsion (Cyprus)",
    "scottish-premiership": "SPL (Scotland)",
    "scottish-championship": "Scottish Championship (Scotland)",
    "scottish-league-one": "Scottish League One (Scotland)",
    "scottish-league-two": "Scottish League Two (Scotland)",
}

def normalize_league_name(raw, known_targets=None, use_fuzzy=False):
    if pd.isna(raw):
        return ""
    s = normalize_text(raw)
    all_aliases = {**LEAGUE_ALIASES, **TRANSFERMARKT_TO_PLAYER_LEAGUES}

    if s in all_aliases:
        return all_aliases[s]

    if known_targets:
        normalized_targets = {normalize_text(k): k for k in known_targets}
        if s in normalized_targets:
            return normalized_targets[s]

    return raw

COUNTRY_ALIASES = {
    "england": "England",
    "english": "England",
    "united kingdom": "England",
    "scotland": "Scotland",
    "wales": "Wales",
    "spain": "Spain",
    "italy": "Italy",
    "france": "France",
    "germany": "Germany",
    "netherlands": "Netherlands",
    "portugal": "Portugal",
    "turkey": "Turkey",
    "brazil": "Brazil",
    "argentina": "Argentina",
}

def normalize_country_name(raw):
    s = normalize_text(raw)
    if not s:
        return raw
    return COUNTRY_ALIASES.get(s, raw if isinstance(raw, str) else raw)

def _rename_columns_safe(df):
    df = df.copy()
    if "Team" in df.columns and "Team within selected timeframe" in df.columns:
        df = df.drop(columns=["Team"])
    if "Team within selected timeframe" in df.columns:
        df = df.rename(columns={"Team within selected timeframe": "Team"})
    return df

def normalize_league_weights(raw_weights):
    if not raw_weights:
        return {}
    min_w = min(raw_weights.values())
    max_w = max(raw_weights.values())
    if max_w > min_w:
        return {
            k: round(0.75 + 0.25 * (v - min_w) / (max_w - min_w), 4)
            for k, v in raw_weights.items()
        }
    return raw_weights

import numpy as np
import pandas as pd

# =========================
# HELPERS
# =========================
def _safe_num(v, default=0.0):
    try:
        if pd.isna(v):
            return default
        return float(v)
    except Exception:
        return default

def _pct_to_dec(v):
    v = _safe_num(v, 0.0)
    return v / 100.0 if v > 1 else v

def _get(row, col, default=0.0):
    return _safe_num(row.get(col, default), default)

def _minutes_factor(minutes):
    """
    Mid-season adjustment (dataset starts in August, snapshot in January).
    """
    m = _safe_num(minutes, 0)
    return np.clip(0.55 + 0.45 * (m / 900.0), 0.55, 1.00)

def _reliability_flag(minutes):
    m = _safe_num(minutes, 0)
    if m < 300:
        return "Very Low"
    elif m < 600:
        return "Low"
    elif m < 900:
        return "Medium"
    return "High"

def _ensure_minutes(df):
    df = df.copy()
    if "Minutes" not in df.columns:
        for alt in ["Minutes played", "Mins played", "Time Played"]:
            if alt in df.columns:
                df["Minutes"] = df[alt]
                break
        else:
            df["Minutes"] = 0
    return df

def _position_percentile(series):
    s = pd.to_numeric(series, errors="coerce")
    if s.notna().sum() <= 1:
        return pd.Series(np.full(len(series), 50.0), index=series.index)
    return s.rank(pct=True, method="average").fillna(0.5) * 100

def club_transfer_profile(transfers_df, club_name, last_n_years=5):
    df = transfers_df.copy()

    for col in ["Club", "Movement", "loan_status", "League"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    for col in ["Age", "Market_Value", "Fee", "Year"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    arrivals = df[
        (df["Club"].str.lower() == club_name.strip().lower()) &
        (df["Movement"].str.lower().isin(["arrival", "incoming", "in"]))
    ].copy()

    if last_n_years is not None and not arrivals.empty and "Year" in arrivals.columns:
        max_year = arrivals["Year"].max()
        arrivals = arrivals[arrivals["Year"] >= max_year - last_n_years + 1].copy()

    all_arrivals = arrivals.copy()

    clean_arrivals = arrivals.copy()
    if "loan_status" in clean_arrivals.columns:
        clean_arrivals = clean_arrivals[
            clean_arrivals["loan_status"].astype(str).str.lower() != "end of loan"
        ].copy()

    perm_arrivals = clean_arrivals.copy()
    if "is_loan" in perm_arrivals.columns:
        perm_arrivals = perm_arrivals[perm_arrivals["is_loan"] == False].copy()

    loan_arrivals = clean_arrivals.copy()
    if "is_loan" in loan_arrivals.columns:
        loan_arrivals = loan_arrivals[loan_arrivals["is_loan"] == True].copy()

    return all_arrivals, clean_arrivals, perm_arrivals, loan_arrivals


def format_financial(value, currency="€"):
    try:
        if pd.isna(value):
            return ""
        value = float(value)
        sign = "-" if value < 0 else ""
        value = abs(value)

        if value >= 1_000_000_000:
            return f"{sign}{currency}{value/1_000_000_000:.1f}bn"
        elif value >= 1_000_000:
            return f"{sign}{currency}{value/1_000_000:.1f}m"
        elif value >= 1_000:
            return f"{sign}{currency}{value/1_000:.0f}k"
        else:
            return f"{sign}{currency}{value:,.0f}"
    except:
        return ""


def classify_age_fit(player_age, avg_age):
    if pd.isna(player_age) or pd.isna(avg_age):
        return "Unknown"

    diff = player_age - avg_age

    if diff < 0:
        if abs(diff) <= 3:
            return "Great Fit"
        elif abs(diff) <= 5:
            return "Moderate Fit"
        else:
            return "Poor Fit"
    else:
        if diff <= 2:
            return "Great Fit"
        elif diff <= 4:
            return "Moderate Fit"
        else:
            return "Poor Fit"

# =========================
# FAILED ACTIONS
# =========================
def _failed_actions(row):
    failed_passes = _get(row, "Passes per 90") * (1 - _pct_to_dec(_get(row, "Accurate passes, %")))
    failed_forward_passes = _get(row, "Forward passes per 90") * (1 - _pct_to_dec(_get(row, "Accurate forward passes, %")))
    failed_long_passes = _get(row, "Long passes per 90") * (1 - _pct_to_dec(_get(row, "Accurate long passes, %")))
    failed_prog_passes = _get(row, "Progressive passes per 90") * (1 - _pct_to_dec(_get(row, "Accurate progressive passes, %")))
    failed_final_third_passes = _get(row, "Passes to final third per 90") * (1 - _pct_to_dec(_get(row, "Accurate passes to final third, %")))
    failed_penalty_area_passes = _get(row, "Passes to penalty area per 90") * (1 - _pct_to_dec(_get(row, "Accurate passes to penalty area, %")))
    failed_through_passes = _get(row, "Through passes per 90") * (1 - _pct_to_dec(_get(row, "Accurate through passes, %")))
    failed_smart_passes = _get(row, "Smart passes per 90") * (1 - _pct_to_dec(_get(row, "Accurate smart passes, %")))
    failed_crosses = _get(row, "Crosses per 90") * (1 - _pct_to_dec(_get(row, "Accurate crosses, %")))
    failed_dribbles = _get(row, "Dribbles per 90") * (1 - _pct_to_dec(_get(row, "Successful dribbles, %")))

    lost_off_duels = _get(row, "Offensive duels per 90") * (1 - _pct_to_dec(_get(row, "Offensive duels won, %")))
    lost_def_duels = _get(row, "Defensive duels per 90") * (1 - _pct_to_dec(_get(row, "Defensive duels won, %")))
    lost_aerial_duels = _get(row, "Aerial duels per 90") * (1 - _pct_to_dec(_get(row, "Aerial duels won, %")))

    failed_risky_passes = failed_smart_passes + failed_through_passes + failed_penalty_area_passes + failed_crosses
    failed_simple_passes = max(
        failed_passes - failed_prog_passes - failed_final_third_passes - failed_risky_passes,
        0.0
    )

    return {
        "failed_passes": failed_passes,
        "failed_simple_passes": failed_simple_passes,
        "failed_forward_passes": failed_forward_passes,
        "failed_long_passes": failed_long_passes,
        "failed_prog_passes": failed_prog_passes,
        "failed_final_third_passes": failed_final_third_passes,
        "failed_penalty_area_passes": failed_penalty_area_passes,
        "failed_through_passes": failed_through_passes,
        "failed_smart_passes": failed_smart_passes,
        "failed_crosses": failed_crosses,
        "failed_risky_passes": failed_risky_passes,
        "failed_dribbles": failed_dribbles,
        "lost_off_duels": lost_off_duels,
        "lost_def_duels": lost_def_duels,
        "lost_aerial_duels": lost_aerial_duels,
    }

# =========================
# STANDARDISATION LOOKUP
# =========================
def _build_std_lookup(df, metrics, position_col="Main_Position"):
    out = {}
    for pos, grp in df.groupby(position_col):
        pos_map = {}
        for metric in metrics:
            if metric in grp.columns:
                pos_map[metric] = _position_percentile(grp[metric])
            else:
                pos_map[metric] = pd.Series(np.full(len(grp), 50.0), index=grp.index)
        out[pos] = pos_map
    return out

def _std(row_idx, pos, metric, std_lookup):
    try:
        return float(std_lookup[pos][metric].loc[row_idx])
    except Exception:
        return 50.0

# =========================
# POSITION MODELS
# =========================
def _calc_gk_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = "GK"

    shot_stopping = (
        0.35 * _std(row_idx, pos, "Save rate, %", std_lookup) +
        0.35 * _std(row_idx, pos, "Prevented goals per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Clean sheets", std_lookup) +
        0.10 * _std(row_idx, pos, "Shots against per 90", std_lookup)
    )

    command = (
        0.40 * _std(row_idx, pos, "Exits per 90", std_lookup) +
        0.30 * _std(row_idx, pos, "Aerial duels per 90", std_lookup) +
        0.30 * _std(row_idx, pos, "Aerial duels won, %", std_lookup)
    )

    distribution = (
        0.25 * _std(row_idx, pos, "Passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Accurate passes, %", std_lookup) +
        0.20 * _std(row_idx, pos, "Long passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Accurate long passes, %", std_lookup) +
        0.15 * _std(row_idx, pos, "Average long pass length, m", std_lookup)
    )

    buildup_support = (
        0.45 * _std(row_idx, pos, "Back passes received as GK per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Passes per 90", std_lookup) +
        0.30 * _std(row_idx, pos, "Accurate passes, %", std_lookup)
    )

    positive = (
        0.42 * shot_stopping +
        0.20 * command +
        0.22 * distribution +
        0.16 * buildup_support
    )

    negative = (
        0.26 * _std(row_idx, pos, "Conceded goals per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "xG against per 90", std_lookup) +
        0.14 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_long_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "lost_aerial_duels", std_lookup) +
        0.08 * _std(row_idx, pos, "Red cards per 90", std_lookup) +
        0.06 * _std(row_idx, pos, "Yellow cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "shot_stopping": shot_stopping,
            "command": command,
            "distribution": distribution,
            "buildup_support": buildup_support
        }

    return raw, positive, negative


def _calc_cb_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = "CB"

    defensive_actions = (
        0.45 * _std(row_idx, pos, "Successful defensive actions per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Sliding tackles per 90", std_lookup) +
        0.15 * _std(row_idx, pos, "Shots blocked per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "PAdj Interceptions", std_lookup)
    )

    duel_dominance = (
        0.35 * _std(row_idx, pos, "Defensive duels per 90", std_lookup) +
        0.65 * _std(row_idx, pos, "Defensive duels won, %", std_lookup)
    )

    aerial = (
        0.35 * _std(row_idx, pos, "Aerial duels per 90", std_lookup) +
        0.65 * _std(row_idx, pos, "Aerial duels won, %", std_lookup)
    )

    reading = (
        0.55 * _std(row_idx, pos, "Interceptions per 90", std_lookup) +
        0.45 * _std(row_idx, pos, "PAdj Interceptions", std_lookup)
    )

    buildup = (
        0.30 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Accurate progressive passes, %", std_lookup) +
        0.25 * _std(row_idx, pos, "Passes to final third per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Accurate passes, %", std_lookup)
    )

    positive = (
        0.28 * defensive_actions +
        0.22 * duel_dominance +
        0.22 * aerial +
        0.16 * reading +
        0.12 * buildup
    )

    negative = (
        0.20 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.14 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_final_third_passes", std_lookup) +
        0.08 * _std(row_idx, pos, "failed_long_passes", std_lookup) +
        0.16 * _std(row_idx, pos, "lost_def_duels", std_lookup) +
        0.14 * _std(row_idx, pos, "lost_aerial_duels", std_lookup) +
        0.08 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.04 * _std(row_idx, pos, "Yellow cards per 90", std_lookup) +
        0.06 * _std(row_idx, pos, "Red cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "defensive_actions": defensive_actions,
            "duel_dominance": duel_dominance,
            "aerial": aerial,
            "reading": reading,
            "buildup": buildup
        }

    return raw, positive, negative


def _calc_fb_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = normalise_position(row.get("Main_Position", row.get("Position", "")))  # LB or RB

    defending = (
        0.30 * _std(row_idx, pos, "Successful defensive actions per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Defensive duels per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Defensive duels won, %", std_lookup) +
        0.20 * _std(row_idx, pos, "Interceptions per 90", std_lookup)
    )

    progression = (
        0.24 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate progressive passes, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Passes to final third per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accelerations per 90", std_lookup)
    )

    chance_creation = (
        0.24 * _std(row_idx, pos, "Crosses per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate crosses, %", std_lookup) +
        0.16 * _std(row_idx, pos, "Deep completed crosses per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "xA per 90", std_lookup) +
        0.14 * _std(row_idx, pos, "Key passes per 90", std_lookup) +
        0.12 * _std(row_idx, pos, "Shot assists per 90", std_lookup)
    )

    control = (
        0.26 * _std(row_idx, pos, "Passes per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Accurate passes, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Forward passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate forward passes, %", std_lookup) +
        0.16 * _std(row_idx, pos, "Received passes per 90", std_lookup)
    )

    duel_work = (
        0.35 * _std(row_idx, pos, "Offensive duels per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Offensive duels won, %", std_lookup) +
        0.20 * _std(row_idx, pos, "Defensive duels won, %", std_lookup) +
        0.20 * _std(row_idx, pos, "Aerial duels won, %", std_lookup)
    )

    positive = (
        0.24 * defending +
        0.26 * progression +
        0.22 * chance_creation +
        0.16 * control +
        0.12 * duel_work
    )

    negative = (
        0.18 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_crosses", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_final_third_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_dribbles", std_lookup) +
        0.14 * _std(row_idx, pos, "lost_def_duels", std_lookup) +
        0.10 * _std(row_idx, pos, "lost_off_duels", std_lookup) +
        0.08 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.04 * _std(row_idx, pos, "Yellow cards per 90", std_lookup) +
        0.02 * _std(row_idx, pos, "Red cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "defending": defending,
            "progression": progression,
            "chance_creation": chance_creation,
            "control": control,
            "duel_work": duel_work
        }

    return raw, positive, negative


def _calc_cmf_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = "CM"

    ball_progression = (
        0.22 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate progressive passes, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Passes to final third per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Accurate passes to final third, %", std_lookup)
    )

    control = (
        0.20 * _std(row_idx, pos, "Passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Accurate passes, %", std_lookup) +
        0.15 * _std(row_idx, pos, "Short / medium passes per 90", std_lookup) +
        0.15 * _std(row_idx, pos, "Accurate short / medium passes, %", std_lookup) +
        0.15 * _std(row_idx, pos, "Received passes per 90", std_lookup) +
        0.15 * _std(row_idx, pos, "Forward passes per 90", std_lookup)
    )

    creation = (
        0.22 * _std(row_idx, pos, "xA per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Shot assists per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Key passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Smart passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Through passes per 90", std_lookup)
    )

    ball_winning = (
        0.24 * _std(row_idx, pos, "Successful defensive actions per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Defensive duels per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Defensive duels won, %", std_lookup) +
        0.16 * _std(row_idx, pos, "Interceptions per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "PAdj Interceptions", std_lookup)
    )

    carrying = (
        0.34 * _std(row_idx, pos, "Dribbles per 90", std_lookup) +
        0.24 * _std(row_idx, pos, "Successful dribbles, %", std_lookup) +
        0.22 * _std(row_idx, pos, "Accelerations per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Fouls suffered per 90", std_lookup)
    )

    positive = (
        0.26 * ball_progression +
        0.22 * control +
        0.18 * creation +
        0.20 * ball_winning +
        0.14 * carrying
    )

    negative = (
        0.20 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_final_third_passes", std_lookup) +
        0.08 * _std(row_idx, pos, "failed_smart_passes", std_lookup) +
        0.08 * _std(row_idx, pos, "failed_through_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_dribbles", std_lookup) +
        0.12 * _std(row_idx, pos, "lost_def_duels", std_lookup) +
        0.08 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.07 * _std(row_idx, pos, "Yellow cards per 90", std_lookup) +
        0.05 * _std(row_idx, pos, "Red cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "ball_progression": ball_progression,
            "control": control,
            "creation": creation,
            "ball_winning": ball_winning,
            "carrying": carrying
        }

    return raw, positive, negative


def _calc_dmf_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = "DMF"

    ball_winning = (
        0.24 * _std(row_idx, pos, "Successful defensive actions per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Defensive duels per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Defensive duels won, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Interceptions per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "PAdj Interceptions", std_lookup)
    )

    control = (
        0.18 * _std(row_idx, pos, "Passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate passes, %", std_lookup) +
        0.16 * _std(row_idx, pos, "Short / medium passes per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Accurate short / medium passes, %", std_lookup) +
        0.16 * _std(row_idx, pos, "Back passes per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Accurate back passes, %", std_lookup)
    )

    progression = (
        0.24 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate progressive passes, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Passes to final third per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Accurate passes to final third, %", std_lookup) +
        0.12 * _std(row_idx, pos, "Long passes per 90", std_lookup) +
        0.12 * _std(row_idx, pos, "Accurate long passes, %", std_lookup)
    )

    distribution = (
        0.34 * _std(row_idx, pos, "Forward passes per 90", std_lookup) +
        0.28 * _std(row_idx, pos, "Accurate forward passes, %", std_lookup) +
        0.20 * _std(row_idx, pos, "Duels won, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Fouls suffered per 90", std_lookup)
    )

    creation = (
        0.24 * _std(row_idx, pos, "Key passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Shot assists per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Smart passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Through passes per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "xA per 90", std_lookup)
    )

    positive = (
        0.28 * ball_winning +
        0.24 * control +
        0.20 * progression +
        0.16 * distribution +
        0.12 * creation
    )

    negative = (
        0.20 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_final_third_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_smart_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_through_passes", std_lookup) +
        0.08 * _std(row_idx, pos, "failed_long_passes", std_lookup) +
        0.14 * _std(row_idx, pos, "lost_def_duels", std_lookup) +
        0.08 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.04 * _std(row_idx, pos, "Yellow cards per 90", std_lookup) +
        0.04 * _std(row_idx, pos, "Red cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "ball_winning": ball_winning,
            "control": control,
            "progression": progression,
            "distribution": distribution,
            "creation": creation
        }

    return raw, positive, negative


def _calc_amf_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = "AMF"

    creation = (
        0.24 * _std(row_idx, pos, "xA per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Key passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Shot assists per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Smart passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Through passes per 90", std_lookup)
    )

    final_third_progression = (
        0.24 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate progressive passes, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Passes to penalty area per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Deep completions per 90", std_lookup)
    )

    scoring_threat = (
        0.26 * _std(row_idx, pos, "Goals per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Non-penalty goals per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "xG per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Shots per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Touches in box per 90", std_lookup)
    )

    carrying = (
        0.26 * _std(row_idx, pos, "Dribbles per 90", std_lookup) +
        0.22 * _std(row_idx, pos, "Successful dribbles, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Accelerations per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Fouls suffered per 90", std_lookup)
    )

    connection = (
        0.24 * _std(row_idx, pos, "Received passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Accurate passes, %", std_lookup) +
        0.18 * _std(row_idx, pos, "Forward passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Accurate forward passes, %", std_lookup)
    )

    positive = (
        0.28 * creation +
        0.22 * final_third_progression +
        0.20 * scoring_threat +
        0.16 * carrying +
        0.14 * connection
    )

    negative = (
        0.14 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_final_third_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_smart_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_through_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_dribbles", std_lookup) +
        0.08 * _std(row_idx, pos, "lost_off_duels", std_lookup) +
        0.10 * _std(row_idx, pos, "finishing_waste", std_lookup) +
        0.07 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.05 * _std(row_idx, pos, "Yellow cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "creation": creation,
            "final_third_progression": final_third_progression,
            "scoring_threat": scoring_threat,
            "carrying": carrying,
            "connection": connection
        }

    return raw, positive, negative


def _calc_winger_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = normalise_position(row.get("Main_Position", row.get("Position", "")))  # LW or RW

    dribbling = (
        0.28 * _std(row_idx, pos, "Dribbles per 90", std_lookup) +
        0.24 * _std(row_idx, pos, "Successful dribbles, %", std_lookup) +
        0.24 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.24 * _std(row_idx, pos, "Accelerations per 90", std_lookup)
    )

    creation = (
        0.22 * _std(row_idx, pos, "xA per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Key passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Shot assists per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Crosses per 90", std_lookup) +
        0.10 * _std(row_idx, pos, "Accurate crosses, %", std_lookup) +
        0.12 * _std(row_idx, pos, "Deep completed crosses per 90", std_lookup)
    )

    threat = (
        0.24 * _std(row_idx, pos, "Goals per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Non-penalty goals per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "xG per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Touches in box per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Shots per 90", std_lookup)
    )

    progression = (
        0.24 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Passes to penalty area per 90", std_lookup) +
        0.18 * _std(row_idx, pos, "Deep completions per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Received long passes per 90", std_lookup)
    )

    duel_value = (
        0.36 * _std(row_idx, pos, "Offensive duels per 90", std_lookup) +
        0.28 * _std(row_idx, pos, "Offensive duels won, %", std_lookup) +
        0.20 * _std(row_idx, pos, "Fouls suffered per 90", std_lookup) +
        0.16 * _std(row_idx, pos, "Touches in box per 90", std_lookup)
    )

    positive = (
        0.24 * dribbling +
        0.24 * creation +
        0.22 * threat +
        0.18 * progression +
        0.12 * duel_value
    )

    negative = (
        0.10 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_crosses", std_lookup) +
        0.16 * _std(row_idx, pos, "failed_dribbles", std_lookup) +
        0.12 * _std(row_idx, pos, "lost_off_duels", std_lookup) +
        0.10 * _std(row_idx, pos, "failed_final_third_passes", std_lookup) +
        0.08 * _std(row_idx, pos, "finishing_waste", std_lookup) +
        0.07 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.03 * _std(row_idx, pos, "Yellow cards per 90", std_lookup) +
        0.02 * _std(row_idx, pos, "Red cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "dribbling": dribbling,
            "creation": creation,
            "threat": threat,
            "progression": progression,
            "duel_value": duel_value
        }

    return raw, positive, negative


def _calc_cf_impact_raw(row, row_idx, std_lookup, return_components=False):
    pos = "CF"

    finishing = (
        0.35 * _std(row_idx, pos, "Non-penalty goals per 90", std_lookup) +
        0.30 * _std(row_idx, pos, "xG per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Goal conversion, %", std_lookup) +
        0.15 * _std(row_idx, pos, "Shots on target, %", std_lookup)
    )

    box_threat = (
        0.35 * _std(row_idx, pos, "Touches in box per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Shots per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "xG per 90", std_lookup) +
        0.15 * _std(row_idx, pos, "Progressive runs per 90", std_lookup)
    )

    chance_creation = (
        0.35 * _std(row_idx, pos, "xA per 90", std_lookup) +
        0.25 * _std(row_idx, pos, "Shot assists per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Key passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Smart passes per 90", std_lookup)
    )

    progression = (
        0.35 * _std(row_idx, pos, "Progressive runs per 90", std_lookup) +
        0.30 * _std(row_idx, pos, "Progressive passes per 90", std_lookup) +
        0.20 * _std(row_idx, pos, "Passes to penalty area per 90", std_lookup) +
        0.15 * _std(row_idx, pos, "Accelerations per 90", std_lookup)
    )

    duel_value = (
        0.35 * _std(row_idx, pos, "Offensive duels per 90", std_lookup) +
        0.35 * _std(row_idx, pos, "Offensive duels won, %", std_lookup) +
        0.30 * _std(row_idx, pos, "Aerial duels won, %", std_lookup)
    )

    positive = (
        0.32 * finishing +
        0.24 * box_threat +
        0.18 * chance_creation +
        0.14 * progression +
        0.12 * duel_value
    )

    negative = (
        0.28 * _std(row_idx, pos, "finishing_waste", std_lookup) +
        0.16 * _std(row_idx, pos, "failed_simple_passes", std_lookup) +
        0.14 * _std(row_idx, pos, "failed_prog_passes", std_lookup) +
        0.12 * _std(row_idx, pos, "failed_dribbles", std_lookup) +
        0.10 * _std(row_idx, pos, "lost_off_duels", std_lookup) +
        0.08 * _std(row_idx, pos, "lost_aerial_duels", std_lookup) +
        0.06 * _std(row_idx, pos, "Fouls per 90", std_lookup) +
        0.04 * _std(row_idx, pos, "Yellow cards per 90", std_lookup) +
        0.02 * _std(row_idx, pos, "Red cards per 90", std_lookup)
    )

    raw = (positive - negative) * _minutes_factor(_get(row, "Minutes", 0))

    if return_components:
        return raw, positive, negative, {
            "finishing": finishing,
            "box_threat": box_threat,
            "chance_creation": chance_creation,
            "progression": progression,
            "duel_value": duel_value
        }

    return raw, positive, negative

# =========================
# ROLE FIT CONFIG
# =========================
STYLE_COLUMNS = [
    "Control Possession",
    "Gegenpressing",
    "Direct Play",
    "Defensive Counter Attack",
    "Tiki Taka",
    "Counter Attack",
    "Wing Play",
    "Low Block"
]

STYLE_ALIASES = {
    "Defensive Counter Attacking": "Defensive Counter Attack"
}

ROLE_STYLE_WEIGHTS = {
    "CF": {
        "Deep-Lying Forward": {
            "Control Possession": 0.90, "Gegenpressing": 0.55, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.95, "Counter Attack": 0.35,
            "Wing Play": 0.30, "Low Block": 0.05
        },
        "Target Forward": {
            "Control Possession": 0.25, "Gegenpressing": 0.35, "Direct Play": 0.95,
            "Defensive Counter Attack": 0.80, "Tiki Taka": 0.10, "Counter Attack": 0.55,
            "Wing Play": 0.90, "Low Block": 0.45
        },
        "Poacher": {
            "Control Possession": 0.20, "Gegenpressing": 0.35, "Direct Play": 0.85,
            "Defensive Counter Attack": 0.35, "Tiki Taka": 0.25, "Counter Attack": 0.95,
            "Wing Play": 0.60, "Low Block": 0.10
        },
        "Complete Forward": {
            "Control Possession": 0.70, "Gegenpressing": 0.65, "Direct Play": 0.55,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.75, "Counter Attack": 0.60,
            "Wing Play": 0.75, "Low Block": 0.05
        },
        "Advanced Forward": {
            "Control Possession": 0.45, "Gegenpressing": 0.65, "Direct Play": 0.75,
            "Defensive Counter Attack": 0.30, "Tiki Taka": 0.35, "Counter Attack": 0.85,
            "Wing Play": 0.60, "Low Block": 0.05
        },
        "Pressing Forward": {
            "Control Possession": 0.55, "Gegenpressing": 1.00, "Direct Play": 0.45,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.45, "Counter Attack": 0.70,
            "Wing Play": 0.45, "Low Block": 0.00
        },
        "Trequartista": {
            "Control Possession": 0.65, "Gegenpressing": 0.20, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.05, "Tiki Taka": 0.85, "Counter Attack": 0.45,
            "Wing Play": 0.55, "Low Block": 0.00
        }
    },

    "AMF": {
        "Shadow Striker": {
            "Control Possession": 0.45, "Gegenpressing": 0.55, "Direct Play": 0.40,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.70, "Counter Attack": 0.85,
            "Wing Play": 0.35, "Low Block": 0.05
        },
        "Advanced Playmaker": {
            "Control Possession": 0.95, "Gegenpressing": 0.60, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 1.00, "Counter Attack": 0.30,
            "Wing Play": 0.45, "Low Block": 0.00
        },
        "Enganche": {
            "Control Possession": 0.90, "Gegenpressing": 0.25, "Direct Play": 0.10,
            "Defensive Counter Attack": 0.05, "Tiki Taka": 0.95, "Counter Attack": 0.20,
            "Wing Play": 0.30, "Low Block": 0.00
        },
        "Trequartista": {
            "Control Possession": 0.65, "Gegenpressing": 0.25, "Direct Play": 0.25,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.85, "Counter Attack": 0.55,
            "Wing Play": 0.65, "Low Block": 0.00
        }
    },

    "CM": {
        "Box-To-Box Midfielder": {
            "Control Possession": 0.55, "Gegenpressing": 0.90, "Direct Play": 0.40,
            "Defensive Counter Attack": 0.35, "Tiki Taka": 0.40, "Counter Attack": 0.80,
            "Wing Play": 0.60, "Low Block": 0.20
        },
        "Carrilero": {
            "Control Possession": 0.75, "Gegenpressing": 0.70, "Direct Play": 0.25,
            "Defensive Counter Attack": 0.25, "Tiki Taka": 0.55, "Counter Attack": 0.35,
            "Wing Play": 0.75, "Low Block": 0.05
        },
        "Ball Winning Midfielder (Defend)": {
            "Control Possession": 0.35, "Gegenpressing": 0.95, "Direct Play": 0.45,
            "Defensive Counter Attack": 0.75, "Tiki Taka": 0.20, "Counter Attack": 0.65,
            "Wing Play": 0.25, "Low Block": 0.80
        },
        "Central Midfielder (Support)": {
            "Control Possession": 0.70, "Gegenpressing": 0.60, "Direct Play": 0.50,
            "Defensive Counter Attack": 0.45, "Tiki Taka": 0.55, "Counter Attack": 0.45,
            "Wing Play": 0.50, "Low Block": 0.35
        },
        "Advanced Playmaker (Attack)": {
            "Control Possession": 0.85, "Gegenpressing": 0.55, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.95, "Counter Attack": 0.30,
            "Wing Play": 0.50, "Low Block": 0.05
        },
        "Advanced Playmaker (Support)": {
            "Control Possession": 0.88, "Gegenpressing": 0.58, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.12, "Tiki Taka": 0.92, "Counter Attack": 0.32,
            "Wing Play": 0.48, "Low Block": 0.05
        },
        "Mezzala": {
            "Control Possession": 0.55, "Gegenpressing": 0.75, "Direct Play": 0.25,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.70, "Counter Attack": 0.45,
            "Wing Play": 0.80, "Low Block": 0.05
        }
    },

    "DMF": {
        "Regista": {
            "Control Possession": 0.95, "Gegenpressing": 0.45, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.15, "Tiki Taka": 1.00, "Counter Attack": 0.20,
            "Wing Play": 0.45, "Low Block": 0.05
        },
        "Deep Lying Playmaker": {
            "Control Possession": 0.95, "Gegenpressing": 0.45, "Direct Play": 0.35,
            "Defensive Counter Attack": 0.40, "Tiki Taka": 0.95, "Counter Attack": 0.25,
            "Wing Play": 0.20, "Low Block": 0.30
        },
        "Half Back": {
            "Control Possession": 0.85, "Gegenpressing": 0.60, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.70, "Tiki Taka": 0.70, "Counter Attack": 0.20,
            "Wing Play": 0.10, "Low Block": 0.40
        },
        "Anchor": {
            "Control Possession": 0.55, "Gegenpressing": 0.45, "Direct Play": 0.35,
            "Defensive Counter Attack": 0.90, "Tiki Taka": 0.20, "Counter Attack": 0.35,
            "Wing Play": 0.10, "Low Block": 0.95
        },
        "Segundo Volante": {
            "Control Possession": 0.65, "Gegenpressing": 0.85, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.45, "Counter Attack": 0.70,
            "Wing Play": 0.35, "Low Block": 0.05
        },
        "Ball Winning Midfielder": {
            "Control Possession": 0.35, "Gegenpressing": 0.95, "Direct Play": 0.45,
            "Defensive Counter Attack": 0.75, "Tiki Taka": 0.20, "Counter Attack": 0.65,
            "Wing Play": 0.25, "Low Block": 0.80
        },
        "Roaming Playmaker": {
            "Control Possession": 0.85, "Gegenpressing": 0.70, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.85, "Counter Attack": 0.40,
            "Wing Play": 0.45, "Low Block": 0.10
        }
    },

    "CB": {
        "Wide Centre-Back (LCB)": {
            "Control Possession": 0.70, "Gegenpressing": 0.80, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.65, "Counter Attack": 0.35,
            "Wing Play": 0.60, "Low Block": 0.10
        },
        "No-Nonsense Centre-Back": {
            "Control Possession": 0.15, "Gegenpressing": 0.30, "Direct Play": 0.90,
            "Defensive Counter Attack": 0.95, "Tiki Taka": 0.05, "Counter Attack": 0.55,
            "Wing Play": 0.20, "Low Block": 0.95
        },
        "Ball Playing Defender": {
            "Control Possession": 0.95, "Gegenpressing": 0.70, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.15, "Tiki Taka": 0.95, "Counter Attack": 0.20,
            "Wing Play": 0.25, "Low Block": 0.05
        },
        "Wide Centre-Back (RCB)": {
            "Control Possession": 0.70, "Gegenpressing": 0.80, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.65, "Counter Attack": 0.35,
            "Wing Play": 0.60, "Low Block": 0.10
        },
        "Libero": {
            "Control Possession": 0.90, "Gegenpressing": 0.60, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.90, "Counter Attack": 0.25,
            "Wing Play": 0.35, "Low Block": 0.05
        }
    },

    "LB": {
        "No-Nonsense Full-Back": {
            "Control Possession": 0.20, "Gegenpressing": 0.35, "Direct Play": 0.75,
            "Defensive Counter Attack": 0.90, "Tiki Taka": 0.10, "Counter Attack": 0.40,
            "Wing Play": 0.35, "Low Block": 0.95
        },
        "Full-Back": {
            "Control Possession": 0.65, "Gegenpressing": 0.45, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.75, "Tiki Taka": 0.35, "Counter Attack": 0.25,
            "Wing Play": 0.45, "Low Block": 0.80
        },
        "Complete Wing-Back": {
            "Control Possession": 0.70, "Gegenpressing": 0.75, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.70, "Counter Attack": 0.35,
            "Wing Play": 1.00, "Low Block": 0.00
        },
        "Wing-Back": {
            "Control Possession": 0.60, "Gegenpressing": 0.75, "Direct Play": 0.35,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.45, "Counter Attack": 0.40,
            "Wing Play": 0.95, "Low Block": 0.10
        },
        "Inverted Wing-Back": {
            "Control Possession": 0.90, "Gegenpressing": 0.75, "Direct Play": 0.10,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.95, "Counter Attack": 0.15,
            "Wing Play": 0.40, "Low Block": 0.00
        },
        "Inverted Full-Back": {
            "Control Possession": 0.88, "Gegenpressing": 0.65, "Direct Play": 0.10,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.88, "Counter Attack": 0.15,
            "Wing Play": 0.25, "Low Block": 0.10
        }
    },

    "RB": {
        "Full-Back": {
            "Control Possession": 0.65, "Gegenpressing": 0.45, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.75, "Tiki Taka": 0.35, "Counter Attack": 0.25,
            "Wing Play": 0.45, "Low Block": 0.80
        },
        "Complete Wing-Back": {
            "Control Possession": 0.70, "Gegenpressing": 0.75, "Direct Play": 0.30,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.70, "Counter Attack": 0.35,
            "Wing Play": 1.00, "Low Block": 0.00
        },
        "Wing-Back": {
            "Control Possession": 0.60, "Gegenpressing": 0.75, "Direct Play": 0.35,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.45, "Counter Attack": 0.40,
            "Wing Play": 0.95, "Low Block": 0.10
        },
        "Inverted Full-Back": {
            "Control Possession": 0.88, "Gegenpressing": 0.65, "Direct Play": 0.10,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.88, "Counter Attack": 0.15,
            "Wing Play": 0.25, "Low Block": 0.10
        },
        "Inverted Wing-Back": {
            "Control Possession": 0.90, "Gegenpressing": 0.75, "Direct Play": 0.10,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.95, "Counter Attack": 0.15,
            "Wing Play": 0.40, "Low Block": 0.00
        },
        "No-Nonsense Full-Back": {
            "Control Possession": 0.20, "Gegenpressing": 0.35, "Direct Play": 0.75,
            "Defensive Counter Attack": 0.90, "Tiki Taka": 0.10, "Counter Attack": 0.40,
            "Wing Play": 0.35, "Low Block": 0.95
        }
    },

    "RW": {
        "Winger (Support)": {
            "Control Possession": 0.40, "Gegenpressing": 0.50, "Direct Play": 0.80,
            "Defensive Counter Attack": 0.25, "Tiki Taka": 0.30, "Counter Attack": 0.80,
            "Wing Play": 1.00, "Low Block": 0.05
        },
        "Inverted Winger": {
            "Control Possession": 0.80, "Gegenpressing": 0.70, "Direct Play": 0.25,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.85, "Counter Attack": 0.40,
            "Wing Play": 0.55, "Low Block": 0.00
        },
        "Advanced Playmaker (Attack)": {
            "Control Possession": 0.85, "Gegenpressing": 0.55, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.95, "Counter Attack": 0.30,
            "Wing Play": 0.50, "Low Block": 0.05
        },
        "Inside Forward": {
            "Control Possession": 0.55, "Gegenpressing": 0.70, "Direct Play": 0.55,
            "Defensive Counter Attack": 0.15, "Tiki Taka": 0.55, "Counter Attack": 0.75,
            "Wing Play": 0.45, "Low Block": 0.00
        },
        "Winger (Defend)": {
            "Control Possession": 0.25, "Gegenpressing": 0.70, "Direct Play": 0.55,
            "Defensive Counter Attack": 0.55, "Tiki Taka": 0.15, "Counter Attack": 0.55,
            "Wing Play": 0.85, "Low Block": 0.40
        },
        "Advanced Playmaker (Support)": {
            "Control Possession": 0.88, "Gegenpressing": 0.58, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.12, "Tiki Taka": 0.92, "Counter Attack": 0.32,
            "Wing Play": 0.48, "Low Block": 0.05
        }
    },

    "LW": {
        "Advanced Playmaker (Support)": {
            "Control Possession": 0.88, "Gegenpressing": 0.58, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.12, "Tiki Taka": 0.92, "Counter Attack": 0.32,
            "Wing Play": 0.48, "Low Block": 0.05
        },
        "Winger (Support)": {
            "Control Possession": 0.40, "Gegenpressing": 0.50, "Direct Play": 0.80,
            "Defensive Counter Attack": 0.25, "Tiki Taka": 0.30, "Counter Attack": 0.80,
            "Wing Play": 1.00, "Low Block": 0.05
        },
        "Winger (Defend)": {
            "Control Possession": 0.25, "Gegenpressing": 0.70, "Direct Play": 0.55,
            "Defensive Counter Attack": 0.55, "Tiki Taka": 0.15, "Counter Attack": 0.55,
            "Wing Play": 0.85, "Low Block": 0.40
        },
        "Inverted Winger": {
            "Control Possession": 0.80, "Gegenpressing": 0.70, "Direct Play": 0.25,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.85, "Counter Attack": 0.40,
            "Wing Play": 0.55, "Low Block": 0.00
        },
        "Advanced Playmaker (Attack)": {
            "Control Possession": 0.85, "Gegenpressing": 0.55, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.95, "Counter Attack": 0.30,
            "Wing Play": 0.50, "Low Block": 0.05
        },
        "Trequartista (Support)": {
            "Control Possession": 0.65, "Gegenpressing": 0.25, "Direct Play": 0.25,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.85, "Counter Attack": 0.55,
            "Wing Play": 0.65, "Low Block": 0.00
        },
        "Inside Forward (Attack)": {
            "Control Possession": 0.55, "Gegenpressing": 0.70, "Direct Play": 0.55,
            "Defensive Counter Attack": 0.15, "Tiki Taka": 0.55, "Counter Attack": 0.75,
            "Wing Play": 0.45, "Low Block": 0.00
        }
    },

    "GK": {
        "Goalkeeper (Defend)": {
            "Control Possession": 0.20, "Gegenpressing": 0.30, "Direct Play": 0.55,
            "Defensive Counter Attack": 0.75, "Tiki Taka": 0.10, "Counter Attack": 0.40,
            "Wing Play": 0.20, "Low Block": 0.95
        },
        "Sweeper Keeper (Balanced)": {
            "Control Possession": 0.75, "Gegenpressing": 0.80, "Direct Play": 0.20,
            "Defensive Counter Attack": 0.20, "Tiki Taka": 0.75, "Counter Attack": 0.25,
            "Wing Play": 0.15, "Low Block": 0.10
        },
        "Sweeper Keeper (Build-Up)": {
            "Control Possession": 0.95, "Gegenpressing": 0.75, "Direct Play": 0.10,
            "Defensive Counter Attack": 0.10, "Tiki Taka": 0.95, "Counter Attack": 0.10,
            "Wing Play": 0.10, "Low Block": 0.05
        },
        "Goalkeeper (Ball-Playing)": {
            "Control Possession": 0.90, "Gegenpressing": 0.65, "Direct Play": 0.15,
            "Defensive Counter Attack": 0.15, "Tiki Taka": 0.85, "Counter Attack": 0.15,
            "Wing Play": 0.10, "Low Block": 0.10
        }
    }
}

def standardize_team_style_columns(team_styles_df):
    team_styles_df = team_styles_df.copy()
    for old_name, new_name in STYLE_ALIASES.items():
        if old_name in team_styles_df.columns and new_name not in team_styles_df.columns:
            team_styles_df = team_styles_df.rename(columns={old_name: new_name})
    return team_styles_df

def normalize_series(s):
    s = pd.to_numeric(s, errors="coerce").fillna(0.0).clip(lower=0.0)
    total = s.sum()
    if total == 0:
        return pd.Series([0.0] * len(s), index=s.index)
    return s / total

def normalize_role_vector_from_row(player_row, position):
    role_cols = ROLE_COLUMNS_BY_POSITION.get(position, [])
    existing = [r for r in role_cols if r in player_row.index]

    if not existing:
        return pd.Series(dtype=float)

    vals = pd.Series({role: pd.to_numeric(player_row.get(role, 0), errors="coerce") for role in existing})
    vals = vals.fillna(0.0).clip(lower=0.0)

    total = vals.sum()
    if total == 0:
        return pd.Series([0.0] * len(existing), index=existing)

    return vals / total

def build_team_style_vector(team_row):
    raw = pd.Series({style: pd.to_numeric(team_row.get(style, 0), errors="coerce") for style in STYLE_COLUMNS})
    return normalize_series(raw)

def compute_team_role_demand(position, team_style_vector):
    role_map = ROLE_STYLE_WEIGHTS.get(position, {})
    if not role_map:
        return pd.Series(dtype=float)

    demand = {}
    for role, style_weight_map in role_map.items():
        role_weights = pd.Series(style_weight_map).reindex(STYLE_COLUMNS).fillna(0.0)
        demand[role] = float((team_style_vector * role_weights).sum())

    demand = pd.Series(demand)
    demand = normalize_series(demand)
    return demand

def sharpen_distribution(series_like, power=2.0):
    s = pd.to_numeric(series_like, errors="coerce").fillna(0.0).clip(lower=0.0)

    if s.sum() == 0:
        return s

    s = s ** power
    total = s.sum()

    if total == 0:
        return s * 0.0

    return s / total


def weighted_overlap_score(player_role_vector, team_role_demand, power=2.0):
    common_roles = sorted(set(player_role_vector.index).intersection(team_role_demand.index))
    if not common_roles:
        return 0.0

    p = sharpen_distribution(player_role_vector[common_roles], power=power)
    t = sharpen_distribution(team_role_demand[common_roles], power=power)

    return float(np.minimum(p, t).sum() * 100)

def get_top_roles_string(series_like, top_n=3, multiply_100=True):
    if len(series_like) == 0:
        return ""
    top_items = series_like.sort_values(ascending=False).head(top_n).items()
    out = []
    for name, val in top_items:
        score = val * 100 if multiply_100 else val
        out.append(f"{name}: {round(score, 2)}")
    return " | ".join(out)

def get_top_roles_relative_to_best(series_like, top_n=3):
    if len(series_like) == 0:
        return ""

    s = pd.to_numeric(series_like, errors="coerce").fillna(0.0)
    s = s.sort_values(ascending=False).head(top_n)

    if s.empty:
        return ""

    best = float(s.iloc[0])
    if best <= 0:
        return " | ".join([f"{name}: 0.0" for name in s.index])

    out = []
    for name, val in s.items():
        relative_score = (float(val) / best) * 100
        out.append(f"{name}: {round(relative_score, 2)}")

    return " | ".join(out)

def calculate_subjective_role_fit_for_player_to_team(player_row, target_team, team_styles_df):
    position = normalise_position(player_row.get("Main_Position", player_row.get("Position", "")))

    if position not in ROLE_COLUMNS_BY_POSITION:
        return {
            "Role Fit Score": np.nan,
            "Best Team Fit Role": "",
            "Top Team Fit Roles": "",
            "Top Team Demanded Roles": "",
            "Player Top Roles Detailed": ""
        }

    team_styles_df = standardize_team_style_columns(team_styles_df)

    team_match = team_styles_df[
        team_styles_df["Team"].astype(str).str.strip().str.lower() == str(target_team).strip().lower()
    ]

    if team_match.empty:
        return {
            "Role Fit Score": np.nan,
            "Best Team Fit Role": "",
            "Top Team Fit Roles": "",
            "Top Team Demanded Roles": "",
            "Player Top Roles Detailed": ""
        }

    team_row = team_match.iloc[0]

    player_role_vector = normalize_role_vector_from_row(player_row, position)
    if player_role_vector.empty:
        return {
            "Role Fit Score": np.nan,
            "Best Team Fit Role": "",
            "Top Team Fit Roles": "",
            "Top Team Demanded Roles": "",
            "Player Top Roles Detailed": ""
        }

    team_style_vector = build_team_style_vector(team_row)
    team_role_demand = compute_team_role_demand(position, team_style_vector)

    if team_role_demand.empty:
        return {
            "Role Fit Score": np.nan,
            "Best Team Fit Role": "",
            "Top Team Fit Roles": "",
            "Top Team Demanded Roles": "",
            "Player Top Roles Detailed": ""
        }

    role_fit_score = weighted_overlap_score(player_role_vector, team_role_demand, power=2.0)

    aligned = (player_role_vector * team_role_demand).sort_values(ascending=False)
    best_fit_role = aligned.index[0] if len(aligned) else ""
    top_fit_roles = get_top_roles_relative_to_best(aligned, top_n=3)
    top_team_demanded_roles = get_top_roles_string(team_role_demand, top_n=3, multiply_100=True)
    player_top_roles = get_top_roles_string(player_role_vector, top_n=3, multiply_100=True)

    return {
        "Role Fit Score": round(role_fit_score, 2),
        "Best Team Fit Role": best_fit_role,
        "Top Team Fit Roles": top_fit_roles,
        "Top Team Demanded Roles": top_team_demanded_roles,
        "Player Top Roles Detailed": player_top_roles
    }


# =========================
# PLAYER-TO-TARGET-PLAYER SIMILARITY
# =========================
def _safe_series_norm(s):
    s = pd.to_numeric(s, errors="coerce").fillna(0.0).astype(float)
    norm = np.linalg.norm(s.values)
    if norm == 0:
        return s * 0.0
    return s / norm

def _cosine_similarity_from_series(a, b):
    a = pd.to_numeric(a, errors="coerce").fillna(0.0).astype(float)
    b = pd.to_numeric(b, errors="coerce").fillna(0.0).astype(float)

    a_norm = np.linalg.norm(a.values)
    b_norm = np.linalg.norm(b.values)

    if a_norm == 0 or b_norm == 0:
        return np.nan

    score = float(np.dot(a.values, b.values) / (a_norm * b_norm))
    return max(0.0, min(1.0, score))

def get_role_vector_from_row(row, position):
    role_cols = ROLE_COLUMNS_BY_POSITION.get(position, [])
    role_cols = [c for c in role_cols if c in row.index]

    if not role_cols:
        return pd.Series(dtype=float)

    s = pd.Series({c: pd.to_numeric(row.get(c, 0), errors="coerce") for c in role_cols})
    s = s.fillna(0.0).clip(lower=0.0)

    if s.sum() == 0:
        return pd.Series([0.0] * len(s), index=s.index)

    return s / s.sum()

def get_component_vector_from_row(row, position):
    comp_cols = POSITION_COMPONENT_MAP.get(position, [])
    comp_cols = [c for c in comp_cols if c in row.index]

    if not comp_cols:
        return pd.Series(dtype=float)

    s = pd.Series({c: pd.to_numeric(row.get(c, np.nan), errors="coerce") for c in comp_cols})
    s = s.fillna(0.0).astype(float)

    if np.abs(s).sum() == 0:
        return pd.Series([0.0] * len(s), index=s.index)

    return _safe_series_norm(s)

def build_target_team_position_players(df, target_team, position, min_minutes=300):
    d = df.copy()

    if "Main_Position" not in d.columns and "Position" in d.columns:
        d["Main_Position"] = d["Position"]

    d["Main_Position"] = d["Main_Position"].apply(normalise_position)

    if "Minutes" not in d.columns:
        for alt in ["Minutes played", "Mins played", "Time Played"]:
            if alt in d.columns:
                d["Minutes"] = d[alt]
                break
        else:
            d["Minutes"] = 0

    team_pos = d[
        (d["Team"] == target_team) &
        (d["Main_Position"] == position) &
        (d["Minutes"] >= min_minutes)
    ].copy()

    return team_pos

def calculate_player_to_team_player_similarity(
    shortlist_player_row,
    target_team_players_df,
    position,
    role_weight=0.7,
    component_weight=0.3
):
    if target_team_players_df.empty:
        return {
            "Most Similar Target Player": "",
            "Similarity To Target Player %": np.nan,
            "Second Similar Target Player": "",
            "Second Similarity %": np.nan,
            "Matched Role Slot": "",
            "Top Target Player Similarities": ""
        }

    shortlist_role_vec = get_role_vector_from_row(shortlist_player_row, position)
    shortlist_comp_vec = get_component_vector_from_row(shortlist_player_row, position)

    if shortlist_role_vec.empty and shortlist_comp_vec.empty:
        return {
            "Most Similar Target Player": "",
            "Similarity To Target Player %": np.nan,
            "Second Similar Target Player": "",
            "Second Similarity %": np.nan,
            "Matched Role Slot": "",
            "Top Target Player Similarities": ""
        }

    sims = []

    for _, tgt_row in target_team_players_df.iterrows():
        tgt_name = tgt_row.get("Player", "")

        tgt_role_vec = get_role_vector_from_row(tgt_row, position)
        tgt_comp_vec = get_component_vector_from_row(tgt_row, position)

        role_sim = np.nan
        comp_sim = np.nan

        if not shortlist_role_vec.empty and not tgt_role_vec.empty:
            common_roles = sorted(set(shortlist_role_vec.index).intersection(tgt_role_vec.index))
            if common_roles:
                role_sim = _cosine_similarity_from_series(
                    shortlist_role_vec[common_roles],
                    tgt_role_vec[common_roles]
                )

        if not shortlist_comp_vec.empty and not tgt_comp_vec.empty:
            common_comps = sorted(set(shortlist_comp_vec.index).intersection(tgt_comp_vec.index))
            if common_comps:
                comp_sim = _cosine_similarity_from_series(
                    shortlist_comp_vec[common_comps],
                    tgt_comp_vec[common_comps]
                )

        if pd.notna(role_sim) and pd.notna(comp_sim):
            final_sim = (role_weight * role_sim) + (component_weight * comp_sim)
        elif pd.notna(role_sim):
            final_sim = role_sim
        elif pd.notna(comp_sim):
            final_sim = comp_sim
        else:
            final_sim = np.nan

        tgt_best_role, tgt_best_role_score, tgt_role_scores, tgt_top_roles = get_role_scores_from_dataset(tgt_row, position)

        sims.append({
            "Target Player": tgt_name,
            "Similarity": final_sim,
            "Role Similarity": role_sim,
            "Component Similarity": comp_sim,
            "Target Player Best Role": tgt_best_role,
            "Target Player Top Roles": tgt_top_roles
        })

    sims_df = pd.DataFrame(sims)
    sims_df = sims_df.dropna(subset=["Similarity"]).sort_values("Similarity", ascending=False).reset_index(drop=True)

    if sims_df.empty:
        return {
            "Most Similar Target Player": "",
            "Similarity To Target Player %": np.nan,
            "Second Similar Target Player": "",
            "Second Similarity %": np.nan,
            "Matched Role Slot": "",
            "Top Target Player Similarities": ""
        }

    top_1 = sims_df.iloc[0]
    top_2 = sims_df.iloc[1] if len(sims_df) > 1 else None

    top_string_parts = []
    for _, sim_row in sims_df.head(3).iterrows():
        pct = round(float(sim_row["Similarity"]) * 100, 2)
        top_string_parts.append(f'{sim_row["Target Player"]}: {pct}')

    return {
        "Most Similar Target Player": top_1["Target Player"],
        "Similarity To Target Player %": round(float(top_1["Similarity"]) * 100, 2),
        "Second Similar Target Player": top_2["Target Player"] if top_2 is not None else "",
        "Second Similarity %": round(float(top_2["Similarity"]) * 100, 2) if top_2 is not None else np.nan,
        "Matched Role Slot": top_1["Target Player Best Role"] if pd.notna(top_1["Target Player Best Role"]) else "",
        "Top Target Player Similarities": " | ".join(top_string_parts)
    }

def classify_age_fit(player_age, avg_age):
    if pd.isna(player_age) or pd.isna(avg_age):
        return "Unknown"

    diff = player_age - avg_age

    if diff < 0:
        if abs(diff) <= 3:
            return "Great Fit"
        elif abs(diff) <= 5:
            return "Moderate Fit"
        else:
            return "Poor Fit"
    else:
        if diff <= 2:
            return "Great Fit"
        elif diff <= 4:
            return "Moderate Fit"
        else:
            return "Poor Fit"

# =========================
# MAIN FUNCTION
# =========================
def add_player_impact(df):
    df = df.copy()
    df = _ensure_minutes(df)

    if "Main_Position" not in df.columns and "Position" in df.columns:
        df["Main_Position"] = df["Position"]

    df["Main_Position"] = df["Main_Position"].apply(normalise_position)

    failed_rows = df.apply(_failed_actions, axis=1, result_type="expand")
    for col in failed_rows.columns:
        df[col] = failed_rows[col]

    df["finishing_waste"] = (
        df.get("xG per 90", 0).fillna(0).astype(float) -
        df.get("Non-penalty goals per 90", 0).fillna(0).astype(float)
    ).clip(lower=0)

    metrics_needed = [
        "Save rate, %", "Prevented goals per 90", "Clean sheets", "Shots against per 90",
        "Exits per 90", "Aerial duels per 90", "Aerial duels won, %",
        "Passes per 90", "Accurate passes, %", "Long passes per 90", "Accurate long passes, %",
        "Average long pass length, m", "Back passes received as GK per 90",
        "Conceded goals per 90", "xG against per 90",

        "Successful defensive actions per 90", "Sliding tackles per 90", "Shots blocked per 90",
        "Defensive duels per 90", "Defensive duels won, %", "Interceptions per 90",
        "PAdj Interceptions", "Progressive passes per 90", "Accurate progressive passes, %",
        "Passes to final third per 90", "Accurate passes to final third, %",
        "Progressive runs per 90", "Accelerations per 90", "Crosses per 90",
        "Accurate crosses, %", "Deep completed crosses per 90", "xA per 90",
        "Key passes per 90", "Shot assists per 90", "Forward passes per 90",
        "Accurate forward passes, %", "Received passes per 90", "Offensive duels per 90",
        "Offensive duels won, %", "Short / medium passes per 90",
        "Accurate short / medium passes, %", "Back passes per 90", "Accurate back passes, %",
        "Duels won, %", "Fouls suffered per 90", "Smart passes per 90", "Through passes per 90",
        "Passes to penalty area per 90", "Deep completions per 90", "Goals per 90",
        "Non-penalty goals per 90", "xG per 90", "Shots per 90", "Touches in box per 90",
        "Dribbles per 90", "Successful dribbles, %", "Received long passes per 90",
        "Goal conversion, %", "Shots on target, %", "Head goals per 90",

        "Fouls per 90", "Yellow cards per 90", "Red cards per 90",

        "failed_simple_passes", "failed_passes", "failed_forward_passes", "failed_long_passes",
        "failed_prog_passes", "failed_final_third_passes", "failed_penalty_area_passes",
        "failed_through_passes", "failed_smart_passes", "failed_crosses", "failed_risky_passes",
        "failed_dribbles", "lost_off_duels", "lost_def_duels", "lost_aerial_duels",
        "finishing_waste"
    ]

    std_lookup = _build_std_lookup(df, metrics_needed, position_col="Main_Position")

    raw_scores = []
    pos_scores = []
    neg_scores = []
    reliability = []
    component_rows = []

    for idx, row in df.iterrows():
        pos = normalise_position(row.get("Main_Position", row.get("Position", "")))

        if pos == "GK":
            raw, p, n, comps = _calc_gk_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos == "CB":
            raw, p, n, comps = _calc_cb_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos in ["LB", "RB"]:
            raw, p, n, comps = _calc_fb_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos == "CM":
            raw, p, n, comps = _calc_cmf_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos == "DMF":
            raw, p, n, comps = _calc_dmf_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos == "AMF":
            raw, p, n, comps = _calc_amf_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos in ["LW", "RW"]:
            raw, p, n, comps = _calc_winger_impact_raw(row, idx, std_lookup, return_components=True)
        elif pos == "CF":
            raw, p, n, comps = _calc_cf_impact_raw(row, idx, std_lookup, return_components=True)
        else:
            raw, p, n, comps = np.nan, np.nan, np.nan, {}

        raw_scores.append(raw)
        pos_scores.append(p)
        neg_scores.append(n)
        reliability.append(_reliability_flag(row.get("Minutes", 0)))
        component_rows.append(comps)

    df["Player Impact Raw"] = raw_scores
    df["Player Impact Positive"] = pos_scores
    df["Player Impact Negative"] = neg_scores
    df["Impact Reliability"] = reliability
    df["Player Impact"] = np.nan

    for pos in ["GK", "CB", "LB", "RB", "CM", "DMF", "AMF", "LW", "RW", "CF"]:
        mask = df["Main_Position"].apply(normalise_position) == pos
        vals = df.loc[mask, "Player Impact Raw"]
        if vals.notna().sum() == 0:
            continue
        df.loc[mask, "Player Impact"] = _position_percentile(vals).round(2)

    components_df = pd.DataFrame(component_rows)

    if not components_df.empty:
        components_df = components_df.add_prefix("Impact Comp - ")
        df = pd.concat([df.reset_index(drop=True), components_df.reset_index(drop=True)], axis=1)

    return df


# =========================
# APPLY
# =========================
players_df = add_player_impact(players_df)


# =========================
# TEAM COMPARISON / SHORTLIST LAYER
# =========================
def _upgrade_label(delta):
    if pd.isna(delta):
        return np.nan
    if delta >= 15:
        return "Strong Upgrade"
    elif delta >= 8:
        return "Upgrade"
    elif delta >= 3:
        return "Marginal Upgrade"
    elif delta >= -3:
        return "Similar Level"
    return "Below Current Level"


def build_team_position_reference(df, team_col="Team", position_col="Main_Position"):
    df = df.copy()

    base_agg = {
        "team_pos_avg_impact": ("Player Impact", "mean"),
        "team_pos_best_impact": ("Player Impact", "max"),
        "team_pos_weakest_impact": ("Player Impact", "min"),
        "team_pos_avg_positive": ("Player Impact Positive", "mean"),
        "team_pos_avg_negative": ("Player Impact Negative", "mean"),
        "team_pos_player_count": ("Player", "count"),
    }

    all_component_cols = sorted({c for cols in POSITION_COMPONENT_MAP.values() for c in cols})
    for comp_col in all_component_cols:
        if comp_col in df.columns:
            agg_name = f"team_pos_avg_{_comp_short_name(comp_col)}"
            base_agg[agg_name] = (comp_col, "mean")

    ref = (
        df.dropna(subset=["Player Impact"])
          .groupby([team_col, position_col], dropna=False)
          .agg(**base_agg)
          .reset_index()
    )
    return ref


def compare_players_to_target_team(
    df,
    target_team,
    player_position_col="Main_Position",
    team_col="Team",
):
    df = df.copy()

    if "Player Impact" not in df.columns:
        raise ValueError("Player Impact not found. Run add_player_impact(df) first.")

    ref = build_team_position_reference(df, team_col=team_col, position_col=player_position_col)

    target_ref = ref[ref[team_col] == target_team].copy()
    if target_ref.empty:
        raise ValueError(f"No team-position reference found for target team: {target_team}")

    rename_map = {
        team_col: "Target Team",
        player_position_col: "Target Position",
        "team_pos_avg_impact": "Target Team Pos Avg Impact",
        "team_pos_best_impact": "Target Team Best Impact",
        "team_pos_weakest_impact": "Target Team Weakest Impact",
        "team_pos_avg_positive": "Target Team Pos Avg Positive",
        "team_pos_avg_negative": "Target Team Pos Avg Negative",
        "team_pos_player_count": "Target Team Pos Player Count",
    }

    for pos, comp_cols in POSITION_COMPONENT_MAP.items():
        for comp_col in comp_cols:
            source_col = f"team_pos_avg_{_comp_short_name(comp_col)}"
            if source_col in target_ref.columns:
                rename_map[source_col] = _target_avg_col_from_component(comp_col)

    target_ref = target_ref.rename(columns=rename_map)

    df["Target Team"] = target_team
    df["Target Position"] = df[player_position_col]

    df = df.merge(
        target_ref,
        how="left",
        on=["Target Team", "Target Position"]
    )

    df["Impact Delta vs Team Avg"] = (
        df["Player Impact"] - df["Target Team Pos Avg Impact"]
    ).round(2)

    df["Upgrade vs Team"] = df["Impact Delta vs Team Avg"].apply(format_upgrade_vs_team)

    df["Impact Delta vs Best Player"] = (
        df["Player Impact"] - df["Target Team Best Impact"]
    ).round(2)

    df["Impact Delta vs Weakest Player"] = (
        df["Player Impact"] - df["Target Team Weakest Impact"]
    ).round(2)

    df["Positive Delta vs Team Avg"] = (
        df["Player Impact Positive"] - df["Target Team Pos Avg Positive"]
    ).round(2)

    df["Negative Delta vs Team Avg"] = (
        df["Player Impact Negative"] - df["Target Team Pos Avg Negative"]
    ).round(2)

    for pos, comp_cols in POSITION_COMPONENT_MAP.items():
        pos_mask = df["Target Position"] == pos
        for comp_col in comp_cols:
            target_avg_col = _target_avg_col_from_component(comp_col)
            delta_col = _delta_col_from_component(comp_col)
            if comp_col in df.columns and target_avg_col in df.columns:
                df.loc[pos_mask, delta_col] = (
                    df.loc[pos_mask, comp_col] - df.loc[pos_mask, target_avg_col]
                ).round(2)

    df["Biggest Upgrade Area"] = df.apply(
        lambda row: get_biggest_upgrade_area_for_row(row, row.get("Target Position", "")),
        axis=1
    )
    df["Upgrade Level"] = df["Impact Delta vs Team Avg"].apply(_upgrade_label)

    return df


def compare_shortlist_to_target_team(
    shortlist_df,
    full_team_df,
    target_team,
    player_position_col="Main_Position",
    team_col="Team"
):
    shortlist_df = shortlist_df.copy()
    full_team_df = full_team_df.copy()

    if "Player Impact" not in shortlist_df.columns:
        raise ValueError("Player Impact not found in shortlist_df. Run add_player_impact(shortlist_df) first.")
    if "Player Impact" not in full_team_df.columns:
        raise ValueError("Player Impact not found in full_team_df. Run add_player_impact(full_team_df) first.")

    ref = build_team_position_reference(full_team_df, team_col=team_col, position_col=player_position_col)

    target_ref = ref[ref[team_col] == target_team].copy()
    if target_ref.empty:
        raise ValueError(f"No team-position reference found for target team: {target_team}")

    rename_map = {
        team_col: "Target Team",
        player_position_col: "Target Position",
        "team_pos_avg_impact": "Target Team Pos Avg Impact",
        "team_pos_best_impact": "Target Team Best Impact",
        "team_pos_weakest_impact": "Target Team Weakest Impact",
        "team_pos_avg_positive": "Target Team Pos Avg Positive",
        "team_pos_avg_negative": "Target Team Pos Avg Negative",
        "team_pos_player_count": "Target Team Pos Player Count",
    }

    for pos, comp_cols in POSITION_COMPONENT_MAP.items():
        for comp_col in comp_cols:
            source_col = f"team_pos_avg_{_comp_short_name(comp_col)}"
            if source_col in target_ref.columns:
                rename_map[source_col] = _target_avg_col_from_component(comp_col)

    target_ref = target_ref.rename(columns=rename_map)

    shortlist_df["Target Team"] = target_team
    shortlist_df["Target Position"] = shortlist_df[player_position_col]

    shortlist_df = shortlist_df.merge(
        target_ref,
        how="left",
        on=["Target Team", "Target Position"]
    )

    shortlist_df["Impact Delta vs Team Avg"] = (
        shortlist_df["Player Impact"] - shortlist_df["Target Team Pos Avg Impact"]
    ).round(2)

    shortlist_df["Upgrade vs Team"] = shortlist_df["Impact Delta vs Team Avg"].apply(format_upgrade_vs_team)

    shortlist_df["Impact Delta vs Best Player"] = (
        shortlist_df["Player Impact"] - shortlist_df["Target Team Best Impact"]
    ).round(2)

    shortlist_df["Impact Delta vs Weakest Player"] = (
        shortlist_df["Player Impact"] - shortlist_df["Target Team Weakest Impact"]
    ).round(2)

    shortlist_df["Positive Delta vs Team Avg"] = (
        shortlist_df["Player Impact Positive"] - shortlist_df["Target Team Pos Avg Positive"]
    ).round(2)

    shortlist_df["Negative Delta vs Team Avg"] = (
        shortlist_df["Player Impact Negative"] - shortlist_df["Target Team Pos Avg Negative"]
    ).round(2)

    for pos, comp_cols in POSITION_COMPONENT_MAP.items():
        pos_mask = shortlist_df["Target Position"] == pos
        for comp_col in comp_cols:
            target_avg_col = _target_avg_col_from_component(comp_col)
            delta_col = _delta_col_from_component(comp_col)
            if comp_col in shortlist_df.columns and target_avg_col in shortlist_df.columns:
                shortlist_df.loc[pos_mask, delta_col] = (
                    shortlist_df.loc[pos_mask, comp_col] - shortlist_df.loc[pos_mask, target_avg_col]
                ).round(2)

    shortlist_df["Biggest Upgrade Area"] = shortlist_df.apply(
        lambda row: get_biggest_upgrade_area_for_row(row, row.get("Target Position", "")),
        axis=1
    )
    shortlist_df["Upgrade Level"] = shortlist_df["Impact Delta vs Team Avg"].apply(_upgrade_label)

    return shortlist_df


# =========================
# LEAGUE WEIGHTS
# =========================
league_weights = {
    "Premier League (England)": 8.59,
    "La Liga (Spain)": 8.35,
    "Bundesliga (Germany)": 8.40,
    "Serie A (Italy)": 8.42,
    "Serie A (Brazil)": 8.01,
    "Ligue 1 (France)": 8.31,
    "Primeira Liga (Portugal)": 7.86,
    "Super Lig (Turkey)": 7.48,
    "Liga Profesional de Futbol (Argentina)": 7.68,
    "Super League (Greece)": 7.25,
    "Liga MX (Mexico)": 7.55,
    "Premier League (Russia)": 7.39,
    "Fortuna Liga (Czechia)": 7.52,
    "Primera A (Colombia)": 7.26,
    "Pro League (Belgium)": 7.73,
    "Superliga (Denmark)": 7.60,
    "Eredivisie (Netherlands)": 7.62,
    "Division Profesional (Paraguay)": 7.24,
    "Primera A (Ecuador)": 7.17,
    "HNL (Croatia)": 7.40,
    "Segunda División (Spain)": 7.42,
    "Super League (Switzerland)": 7.47,
    "Championship (England)": 7.62,
    "Serie B (Brazil)": 7.25,
    "Bundesliga (Austria)": 7.44,
    "Serie B (Italy)": 7.47,
    "Ligat ha'Al (Israel)": 7.18,
    "Ekstraklasa (Poland)": 7.51,
    "1 division (Cyprus)": 7.29,
    "Allsvenskan (Sweden)": 7.37,
    "Superliga (Romania)": 7.23,
    "Primera División (Uruguay)": 7.25,
    "Segunda Liga (Portugal)": 6.98,
    "Ascenso MX (Mexico)": 6.87,
    "Eliteserien (Norway)": 7.40,
    "Ligue 2 (France)": 7.27,
    "Super Liga (Slovakia)": 7.02,
    "NB 1 (Hungary)": 7.22,
    "Primera Nacional (Argentina)": 6.87,
    "Primera Division (Chile)": 7.18,
    "K League Classic (Korea Republic)": 7.47,
    "Primera División (Costa Rica)": 6.98,
    "Persian Gulf Pro League (Iran)": 6.88,
    "Serie C (Brazil)": 6.87,
    "Lig (Turkey)": 7.48,
    "Super Liga (Serbia)": 6.68,
    "Premijer Liga (Bosnia and Herzegovina)": 6.65,
    "First League (Bulgaria)": 6.86,
    "MLS (USA)": 7.70,
    "EFL League One (England)": 6.91,
    "Eerste Divisie (Netherlands)": 6.39,
    "Liga Portugal 2 (Portugal)": 6.98,
    "Challenger Pro League (Belgium)": 6.66,
    "Bundesliga 2 (Germany)": 7.51,
    "SPL (Scotland)": 7.17
}

def extract_playing_style_from_dataset(player_row, position):
    possible_roles = ROLE_COLUMNS_BY_POSITION.get(position, [])
    role_scores = {
        role: float(player_row.get(role, 0)) for role in possible_roles if role in player_row
    }

    if not role_scores:
        return None, 0.0, role_scores

    best_role = max(role_scores, key=role_scores.get)
    best_score = role_scores[best_role]
    return best_role, best_score, role_scores

def get_role_scores_from_dataset(row, position):
    role_cols = ROLE_COLUMNS_BY_POSITION.get(position, [])
    scores = {role: float(row.get(role, 0)) for role in role_cols if role in row.index}

    if not scores:
        return None, 0, {}, []

    sorted_roles = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_role, top_score = sorted_roles[0]
    top_roles = [r for r, _ in sorted_roles[:3]]
    return top_role, top_score, scores, top_roles


# =========================
# COMPONENT MAPS
# =========================
POSITION_COMPONENT_MAP = {
    "GK": [
        "Impact Comp - shot_stopping",
        "Impact Comp - command",
        "Impact Comp - distribution",
        "Impact Comp - buildup_support",
    ],
    "CB": [
        "Impact Comp - defensive_actions",
        "Impact Comp - duel_dominance",
        "Impact Comp - aerial",
        "Impact Comp - reading",
        "Impact Comp - buildup",
    ],
    "LB": [
        "Impact Comp - defending",
        "Impact Comp - progression",
        "Impact Comp - chance_creation",
        "Impact Comp - control",
        "Impact Comp - duel_work",
    ],
    "RB": [
        "Impact Comp - defending",
        "Impact Comp - progression",
        "Impact Comp - chance_creation",
        "Impact Comp - control",
        "Impact Comp - duel_work",
    ],
    "CM": [
        "Impact Comp - ball_progression",
        "Impact Comp - control",
        "Impact Comp - creation",
        "Impact Comp - ball_winning",
        "Impact Comp - carrying",
    ],
    "DMF": [
        "Impact Comp - ball_winning",
        "Impact Comp - control",
        "Impact Comp - progression",
        "Impact Comp - distribution",
        "Impact Comp - creation",
    ],
    "AMF": [
        "Impact Comp - creation",
        "Impact Comp - final_third_progression",
        "Impact Comp - scoring_threat",
        "Impact Comp - carrying",
        "Impact Comp - connection",
    ],
    "LW": [
        "Impact Comp - dribbling",
        "Impact Comp - creation",
        "Impact Comp - threat",
        "Impact Comp - progression",
        "Impact Comp - duel_value",
    ],
    "RW": [
        "Impact Comp - dribbling",
        "Impact Comp - creation",
        "Impact Comp - threat",
        "Impact Comp - progression",
        "Impact Comp - duel_value",
    ],
    "CF": [
        "Impact Comp - finishing",
        "Impact Comp - box_threat",
        "Impact Comp - chance_creation",
        "Impact Comp - progression",
        "Impact Comp - duel_value",
    ],
}

def _comp_short_name(col):
    return col.replace("Impact Comp - ", "").strip()

def _target_avg_col_from_component(col):
    return f"Target Team Pos Avg {_comp_short_name(col)}"

def _delta_col_from_component(col):
    base = _comp_short_name(col).replace("_", " ").title()
    return f"{base} Delta vs Team Avg"

def _format_delta(value):
    if pd.isna(value):
        return ""
    value = round(float(value), 2)
    return f"+{value}" if value > 0 else str(value)

def format_upgrade_vs_team(delta):
    if pd.isna(delta):
        return ""
    delta = round(float(delta), 2)
    if delta >= 15:
        return f"Strong Upgrade (+{delta})"
    elif delta >= 8:
        return f"Upgrade (+{delta})"
    elif delta >= 3:
        return f"Marginal Upgrade (+{delta})"
    elif delta >= -3:
        return f"Similar Level ({delta})"
    return f"Below Current Level ({delta})"

def get_biggest_upgrade_area_for_row(row, position):
    comp_cols = POSITION_COMPONENT_MAP.get(position, [])
    vals = {}
    for comp_col in comp_cols:
        delta_col = _delta_col_from_component(comp_col)
        v = row.get(delta_col, np.nan)
        if pd.notna(v):
            vals[_comp_short_name(comp_col)] = float(v)

    if not vals:
        return ""

    best_name = max(vals, key=vals.get)
    best_val = vals[best_name]
    return f"{best_name} ({_format_delta(best_val)})"


# In[ ]:


# =========================
# SHORTLIST FUNCTION
# =========================
def external_target_shortlist_absolute_vectorized(
    df,
    target_team,
    season,
    SEASONS_LOOKBACK=3,
    MIN_MINUTES_FOR_AVG=0,
    position_filter=None,
    perf_threshold=0.0,
    age_min=15, age_max=40,
    mv_min=0, mv_max=1_000_000_000,
    top_n=20,
    league_weights=None,
    apply_weights_to_composite=False,
    transfers_df=None,
    club_country_map=None,
    use_fuzzy=True,
    verbose=True,
    team_styles_df=None,
    target_team_min_player_minutes=300,
    similarity_role_weight=0.7,
    similarity_component_weight=0.3,
    include_similarity=True
):
    def parse_agent_mv_plain(value):
        try:
            if isinstance(value, str):
                v = value.lower().replace("€", "").replace("£", "").strip()
                if "bn" in v:
                    return int(float(v.replace("bn", "")) * 1_000_000_000)
                if "m" in v:
                    return int(float(v.replace("m", "")) * 1_000_000)
                if "k" in v:
                    return int(float(v.replace("k", "")) * 1_000)
                return int(float(v))
            elif isinstance(value, (int, float)):
                return int(value)
            return None
        except:
            return None

    def _clip_score(x, low=0.0, high=100.0):
        try:
            if pd.isna(x):
                return np.nan
            return float(np.clip(float(x), low, high))
        except:
            return np.nan

    def _avg_non_null(values):
        vals = [float(v) for v in values if pd.notna(v)]
        return round(sum(vals) / len(vals), 2) if vals else np.nan

    def _fit_to_score(label):
        return {
            "Great Fit": 100.0,
            "Moderate Fit": 60.0,
            "Poor Fit": 20.0,
            "Unknown": np.nan
        }.get(label, np.nan)

    def _recommendation(perf_score, compat_score, financial_score):
        if pd.isna(perf_score) or pd.isna(compat_score) or pd.isna(financial_score):
            return "Incomplete Profile"

        if perf_score >= 85 and compat_score >= 80 and financial_score >= 65:
            return "Elite Target"
        elif perf_score >= 75 and compat_score >= 72 and financial_score >= 55:
            return "Strong Target"
        elif perf_score >= 68 and compat_score >= 65 and financial_score >= 45:
            return "Good Target"
        elif perf_score >= 60 and compat_score >= 58:
            return "Situational Target"
        return "Watchlist"

    if not league_weights:
        league_weights = {}
    else:
        lo, hi = min(league_weights.values()), max(league_weights.values())
        league_weights = {
            k: 0.75 + 0.25 * (v - lo) / (hi - lo) if hi > lo else 0.75
            for k, v in league_weights.items()
        }

    d = df.copy()
    d = prepare_optional_transfer_fields(d)

    if "Minutes" not in d.columns:
        for alt in ["Minutes played", "Mins played", "Time Played"]:
            if alt in d.columns:
                d["Minutes"] = d[alt]
                break
        else:
            raise KeyError("Minutes column missing")

    if "Team" not in d.columns:
        for alt in ["Team within selected timeframe", "Club"]:
            if alt in d.columns:
                d["Team"] = d[alt]
                break
        else:
            raise KeyError("Team column missing")

    if "Position" not in d.columns and "Position" in d.columns:
        d["Position"] = d["Position"]
    d["Position"] = d["Position"].apply(normalise_position)

    d["Season"] = d["Season"].astype(str).str.strip()
    season = str(season).strip()

    known_leagues = sorted(d["League"].dropna().astype(str).unique())
    d["League"] = d["League"].apply(
        lambda x: normalize_league_name(x, known_targets=known_leagues, use_fuzzy=False)
        if pd.notna(x) else x
    )

    if "Nationality" not in d.columns:
        for alt in ["Birth country", "Passport country"]:
            if alt in d.columns:
                d["Nationality"] = d[alt]
                break
    if "Nationality" in d.columns:
        d["Nationality"] = d["Nationality"].apply(normalize_country_name)

    if "Player Impact" not in d.columns:
        d = add_player_impact(d)

    # =========================
    # MARKET VALUE CLEANING
    # TM_Market value is primary; Market value (Wyscout) is per-row fallback when TM is blank
    # =========================
    def _parse_mv_value(val):
        if pd.isna(val):
            return np.nan
        result = pd.to_numeric(val, errors="coerce")
        if pd.notna(result) and result > 0:
            return float(result)
        parsed = parse_agent_mv_plain(val)
        return float(parsed) if parsed is not None and parsed > 0 else np.nan

    tm_col = "TM_Market value" if "TM_Market value" in d.columns else None
    wy_col = next((c for c in ["Market value_TM", "Market value", "Market_Value", "TM_Market_Value_Numeric"] if c in d.columns), None)

    if tm_col is not None:
        tm_parsed = d[tm_col].apply(_parse_mv_value)
        if wy_col is not None:
            wy_parsed = d[wy_col].apply(_parse_mv_value)
            # Use TM where available; fall back to Wyscout per row
            d["MV_Raw"] = tm_parsed.where(tm_parsed.notna(), wy_parsed)
        else:
            d["MV_Raw"] = tm_parsed
    elif wy_col is not None:
        d["MV_Raw"] = d[wy_col].apply(_parse_mv_value)
    else:
        d["MV_Raw"] = np.nan

    if verbose:
        filled = d["MV_Raw"].notna().sum()
        total = len(d)
        tm_filled = d[tm_col].apply(_parse_mv_value).notna().sum() if tm_col else 0
        wy_fallback = int(filled) - int(tm_filled)
        print(f"MV_Raw: {filled}/{total} — {tm_filled} from TM_Market value, {max(wy_fallback,0)} filled from Wyscout fallback")

    d["MV_Clean"] = d["MV_Raw"].copy()
    d.loc[d["MV_Clean"] <= 0, "MV_Clean"] = np.nan

    # use current position field for estimation consistency
    league_pos_median = d.groupby(["League", "Position"])["MV_Clean"].median()
    pos_median = d.groupby("Position")["MV_Clean"].median()
    overall_median = d["MV_Clean"].median()

    def fill_mv(row):
        if pd.notna(row["MV_Clean"]):
            return row["MV_Clean"]

        key = (row.get("League"), row.get("Position"))
        if key in league_pos_median.index and pd.notna(league_pos_median.loc[key]):
            return league_pos_median.loc[key]

        pos = row.get("Position")
        if pos in pos_median.index and pd.notna(pos_median.loc[pos]):
            return pos_median.loc[pos]

        return overall_median

    d["MV_Final"] = d.apply(fill_mv, axis=1)
    d["MV_Was_Estimated"] = d["MV_Clean"].isna()

    start = _season_start_int(season)
    if start is None:
        raise ValueError(f"Could not parse season='{season}'. Use format like '2024-2025'.")

    d["_season_start"] = d["Season"].apply(_season_start_int)

    if SEASONS_LOOKBACK == 1:
        recent = d[d["Season"] == season].copy()
    else:
        recent = d[d["_season_start"].between(start - SEASONS_LOOKBACK + 1, start)].copy()

    if verbose:
        print(f"Requested season: {season}")
        print(f"Recent seasons used: {sorted(recent['Season'].dropna().unique().tolist())}")

    candidate_pool = recent[recent["Season"] == season].copy()

    pool = candidate_pool[candidate_pool["Team"] != target_team].copy()
    if position_filter:
        pool = pool[pool["Position"] == position_filter]

    mv_mask = pool["MV_Final"].between(mv_min, mv_max)

    pool = pool[
        (pool["Age"].between(age_min, age_max)) &
        mv_mask &
        (pool["Minutes"] >= MIN_MINUTES_FOR_AVG)
    ].copy()

    if pool.empty:
        if verbose:
            print("⚠️ Empty pool for", position_filter)
        return pd.DataFrame()

    club = recent[
        (recent["Team"] == target_team) &
        (recent["Minutes"] >= MIN_MINUTES_FOR_AVG)
    ].copy()

    if club.empty:
        if verbose:
            print("⚠️ No valid club data.")
        return pd.DataFrame()

    target_league = club["League"].iloc[0]

    avg_age = np.nan
    avg_mv = np.nan
    avg_fee = np.nan
    clean_arrivals = pd.DataFrame()

    if transfers_df is not None and not transfers_df.empty:
        all_arrivals, clean_arrivals, perm_arrivals, loan_arrivals = club_transfer_profile(
            transfers_df=transfers_df,
            club_name=target_team,
            last_n_years=5
        )

        avg_age = perm_arrivals["Age"].mean() if not perm_arrivals.empty else np.nan
        avg_mv = perm_arrivals["Market_Value"].mean() if not perm_arrivals.empty else np.nan
        avg_fee = perm_arrivals["Fee"].mean() if not perm_arrivals.empty else np.nan

    club_country_weighted = {}
    if clean_arrivals is not None and not clean_arrivals.empty:
        t = clean_arrivals.copy()

        if "Dealing_Country" not in t.columns or t["Dealing_Country"].isna().all():
            if club_country_map and "Dealing_Club" in t.columns:
                t["Dealing_Country"] = t["Dealing_Club"].map(club_country_map)

        if "Dealing_Country" in t.columns:
            t = t.dropna(subset=["Dealing_Country"])
            if not t.empty:
                country_counts = t["Dealing_Country"].value_counts(normalize=True)
                club_country_weighted[target_team] = country_counts.to_dict()

    full_ref = build_team_position_reference(recent, team_col="Team", position_col="Position")
    target_ref = full_ref[full_ref["Team"] == target_team].copy()

    rename_map = {
        "Team": "Target Team",
        "Position": "Target Position",
        "team_pos_avg_impact": "Target Team Pos Avg Impact",
        "team_pos_best_impact": "Target Team Best Impact",
        "team_pos_weakest_impact": "Target Team Weakest Impact",
        "team_pos_avg_positive": "Target Team Pos Avg Positive",
        "team_pos_avg_negative": "Target Team Pos Avg Negative",
        "team_pos_player_count": "Target Team Pos Player Count",
    }

    for pos_key, comp_cols in POSITION_COMPONENT_MAP.items():
        for comp_col in comp_cols:
            source_col = f"team_pos_avg_{_comp_short_name(comp_col)}"
            if source_col in target_ref.columns:
                rename_map[source_col] = _target_avg_col_from_component(comp_col)

    target_ref = target_ref.rename(columns=rename_map)

    rows = []

    metric_cache = {}
    for pos_name in pool["Position"].dropna().unique():
        metrics_pos = [m for m in POSITION_METRICS.get(pos_name, []) if m in recent.columns]
        if not metrics_pos:
            continue

        pos_recent = recent[
            (recent["Position"] == pos_name) &
            (recent["Minutes"] >= MIN_MINUTES_FOR_AVG)
        ].copy()

        if pos_recent.empty:
            continue

        league_means = pos_recent.groupby("League")[metrics_pos].mean()

        target_league_avg = np.zeros(len(metrics_pos))
        league_pool = pos_recent[pos_recent["League"] == target_league]
        if not league_pool.empty:
            target_league_avg = league_pool.reindex(columns=metrics_pos, fill_value=0).mean().to_numpy()

        metric_cache[pos_name] = {
            "metrics": metrics_pos,
            "league_means": league_means,
            "target_league_avg": target_league_avg
        }

    for pos in pool["Position"].dropna().unique():
        pos_pool = pool[pool["Position"] == pos].copy()
        club_pos = club[club["Position"] == pos]

        target_team_players_pos = build_target_team_position_players(
            df=recent,
            target_team=target_team,
            position=pos,
            min_minutes=target_team_min_player_minutes
        )

        if target_team_players_pos.empty and pos in ["LW", "RW"]:
            target_team_players_pos = recent[
                (recent["Team"] == target_team) &
                (recent["Position"].isin(["LW", "RW"])) &
                (recent["Minutes"] >= target_team_min_player_minutes)
            ].copy()

        if pos not in metric_cache:
            continue

        metrics = [m for m in metric_cache[pos]["metrics"] if m in pos_pool.columns]
        if not metrics:
            continue

        league_means = metric_cache[pos]["league_means"]
        P = pos_pool[metrics].fillna(0).to_numpy()

        if not club_pos.empty:
            club_metric_frame = club_pos.reindex(columns=metrics, fill_value=0)
            team_avg = club_metric_frame.mean().to_numpy()
        else:
            club_metric_frame = club.reindex(columns=metrics, fill_value=0)
            team_avg = club_metric_frame.mean().to_numpy()

        weights = np.ones(len(metrics), dtype=float)

        perf_team_pct = (((P > team_avg) * weights).sum(axis=1) / weights.sum()) * 100

        target_league_avg = metric_cache[pos]["target_league_avg"]
        perf_target_pct = (((P > target_league_avg) * weights).sum(axis=1) / weights.sum()) * 100

        perf_own = []
        for j, (_, r_row) in enumerate(pos_pool.iterrows()):
            if r_row["League"] in league_means.index:
                league_avg2 = league_means.loc[r_row["League"], metrics].to_numpy()
            else:
                league_avg2 = np.zeros(len(metrics))

            own_score = (((P[j] > league_avg2) * weights).sum() / weights.sum()) * 100
            perf_own.append(own_score)

        perf_own = np.array(perf_own, dtype=float)

        raw_score = (perf_team_pct + perf_own + perf_target_pct) / 3
        LW = pos_pool["League"].map(lambda x: league_weights.get(x, 0.75)).to_numpy()
        raw_score *= LW

        best_roles, best_role_scores, role_dicts, top3_roles = [], [], [], []
        for _, r_row in pos_pool.iterrows():
            br, bs, rd = extract_playing_style_from_dataset(r_row, pos)
            best_roles.append(br)
            best_role_scores.append(bs)
            role_dicts.append(rd)
            top3_roles.append([k for k, _ in sorted(rd.items(), key=lambda x: x[1], reverse=True)[:3]])

        composite = raw_score * 0.7 + np.array(best_role_scores) * 0.3
        if apply_weights_to_composite:
            composite *= LW

        pos_ref = target_ref[target_ref["Target Position"] == pos]

        if pos_ref.empty and pos in ["LW", "RW"]:
            winger_ref = target_ref[target_ref["Target Position"].isin(["LW", "RW"])]
            if not winger_ref.empty:
                target_team_pos_avg_impact = _safe_num(winger_ref["Target Team Pos Avg Impact"].mean(), np.nan)
                target_team_best_impact = _safe_num(winger_ref["Target Team Best Impact"].max(), np.nan)
                target_team_weakest_impact = _safe_num(winger_ref["Target Team Weakest Impact"].min(), np.nan)
                target_team_pos_avg_positive = _safe_num(winger_ref["Target Team Pos Avg Positive"].mean(), np.nan)
                target_team_pos_avg_negative = _safe_num(winger_ref["Target Team Pos Avg Negative"].mean(), np.nan)
                target_team_pos_player_count = _safe_num(winger_ref["Target Team Pos Player Count"].sum(), np.nan)
            else:
                target_team_pos_avg_impact = np.nan
                target_team_best_impact = np.nan
                target_team_weakest_impact = np.nan
                target_team_pos_avg_positive = np.nan
                target_team_pos_avg_negative = np.nan
                target_team_pos_player_count = np.nan
        elif not pos_ref.empty:
            target_team_pos_avg_impact = _safe_num(pos_ref["Target Team Pos Avg Impact"].iloc[0], np.nan)
            target_team_best_impact = _safe_num(pos_ref["Target Team Best Impact"].iloc[0], np.nan)
            target_team_weakest_impact = _safe_num(pos_ref["Target Team Weakest Impact"].iloc[0], np.nan)
            target_team_pos_avg_positive = _safe_num(pos_ref["Target Team Pos Avg Positive"].iloc[0], np.nan)
            target_team_pos_avg_negative = _safe_num(pos_ref["Target Team Pos Avg Negative"].iloc[0], np.nan)
            target_team_pos_player_count = _safe_num(pos_ref["Target Team Pos Player Count"].iloc[0], np.nan)
        else:
            target_team_pos_avg_impact = np.nan
            target_team_best_impact = np.nan
            target_team_weakest_impact = np.nan
            target_team_pos_avg_positive = np.nan
            target_team_pos_avg_negative = np.nan
            target_team_pos_player_count = np.nan

        for i, idx in enumerate(pos_pool.index):
            if raw_score[i] < perf_threshold:
                continue

            r = pos_pool.loc[idx]

            if team_styles_df is not None:
                subjective_role_fit_info = calculate_subjective_role_fit_for_player_to_team(
                    player_row=r,
                    target_team=target_team,
                    team_styles_df=team_styles_df
                )
            else:
                subjective_role_fit_info = {
                    "Role Fit Score": np.nan,
                    "Best Team Fit Role": "",
                    "Top Team Fit Roles": "",
                    "Top Team Demanded Roles": "",
                    "Player Top Roles Detailed": ""
                }

            if include_similarity:
                similarity_info = calculate_player_to_team_player_similarity(
                    shortlist_player_row=r,
                    target_team_players_df=target_team_players_pos,
                    position=pos,
                    role_weight=similarity_role_weight,
                    component_weight=similarity_component_weight
                )
            else:
                similarity_info = {
                    "Most Similar Target Player": "",
                    "Similarity To Target Player %": np.nan,
                    "Second Similar Target Player": "",
                    "Second Similarity %": np.nan,
                    "Matched Role Slot": "",
                    "Top Target Player Similarities": ""
                }

            mv_val = r.get("MV_Raw", np.nan)
            mv_clean = r.get("MV_Clean", np.nan)
            mv_final = r.get("MV_Final", np.nan)
            mv_was_estimated = r.get("MV_Was_Estimated", False)

            if pd.notna(mv_final) and pd.notna(avg_mv):
                mv_fit = classify_fit(mv_final, avg_mv, avg_mv * 0.25, avg_mv * 0.5)
            else:
                mv_fit = "Unknown"

            age_fit = classify_age_fit(r["Age"], avg_age)

            country_match = 0
            if target_team in club_country_weighted:
                player_team = r.get("Team within selected timeframe", r.get("Team"))
                tc = None

                if "Dealing_Country" in r and pd.notna(r.get("Dealing_Country", np.nan)):
                    tc = r.get("Dealing_Country")
                elif club_country_map:
                    tc = club_country_map.get(player_team, None)

                if tc:
                    country_match = club_country_weighted[target_team].get(tc, 0)

            contract_raw = r.get("TM_Contract", r.get("Contract_Final", r.get("Contract", r.get("Contract expires", None))))
            try:
                exp_year = pd.to_datetime(contract_raw, errors="coerce").year
                cur = int(str(season).split("-")[-1])
                yrs = exp_year - cur
                contract_fit = 1.0 if yrs <= 1 else 0.7 if yrs == 2 else 0.4 if yrs == 3 else 0.1
            except Exception:
                contract_fit = 0.5

            if "Player_Status" in r:
                squad_role = r["Player_Status"]
            else:
                try:
                    minutes_ratio = r["Minutes"] / max(club["Minutes"].mean(), 1)
                except Exception:
                    minutes_ratio = 0
                if minutes_ratio >= 0.8:
                    squad_role = "Important Player"
                elif minutes_ratio >= 0.6:
                    squad_role = "Regular Starter"
                elif minutes_ratio >= 0.3:
                    squad_role = "Squad Player"
                elif minutes_ratio >= 0.1:
                    squad_role = "Fringe Player"
                else:
                    squad_role = "Out-of-Favour"

            player_score = r.get("Player_Score", None)

            player_impact = _safe_num(r.get("Player Impact", np.nan), np.nan)
            player_impact_raw = _safe_num(r.get("Player Impact Raw", np.nan), np.nan)
            player_impact_positive = _safe_num(r.get("Player Impact Positive", np.nan), np.nan)
            player_impact_negative = _safe_num(r.get("Player Impact Negative", np.nan), np.nan)

            impact_delta_vs_team_avg = round(
                player_impact - target_team_pos_avg_impact, 2
            ) if pd.notna(player_impact) and pd.notna(target_team_pos_avg_impact) else np.nan

            impact_delta_vs_best_player = round(
                player_impact - target_team_best_impact, 2
            ) if pd.notna(player_impact) and pd.notna(target_team_best_impact) else np.nan

            impact_delta_vs_weakest_player = round(
                player_impact - target_team_weakest_impact, 2
            ) if pd.notna(player_impact) and pd.notna(target_team_weakest_impact) else np.nan

            positive_delta_vs_team_avg = round(
                player_impact_positive - target_team_pos_avg_positive, 2
            ) if pd.notna(player_impact_positive) and pd.notna(target_team_pos_avg_positive) else np.nan

            negative_delta_vs_team_avg = round(
                player_impact_negative - target_team_pos_avg_negative, 2
            ) if pd.notna(player_impact_negative) and pd.notna(target_team_pos_avg_negative) else np.nan

            similarity_pct = _safe_num(similarity_info.get("Similarity To Target Player %", np.nan), np.nan)

            performance_score = _avg_non_null([
                _clip_score(player_impact),
                _clip_score(perf_team_pct[i]),
                _clip_score(perf_target_pct[i]),
                _clip_score(perf_own[i]),
                _clip_score(50 + (2 * impact_delta_vs_team_avg)) if pd.notna(impact_delta_vs_team_avg) else np.nan
            ])

            compatibility_score = _avg_non_null([
                _clip_score(subjective_role_fit_info.get("Role Fit Score", np.nan)),
                _clip_score(similarity_pct) if include_similarity else np.nan,
                100.0 if subjective_role_fit_info.get("Best Team Fit Role", "") == best_roles[i] and best_roles[i] not in [None, ""] else 70.0
            ])

            financial_score = _avg_non_null([
                _fit_to_score(age_fit),
                _fit_to_score(mv_fit)
            ])

            tp = (
                0.30 * (compatibility_score / 100.0) +
                0.20 * (performance_score / 100.0) +
                0.20 * (financial_score / 100.0) +
                0.30 * contract_fit
            ) * 100

            recommendation = _recommendation(performance_score, compatibility_score, financial_score)

            row_dict = {
                "Player": r["Player"],
                "Team": r.get("Team within selected timeframe", r.get("Team")),
                "League": r["League"],
                "Season": r["Season"],
                "Position": pos,
                "Age": r["Age"],
                "Minutes": r["Minutes"],
                "Height": r.get("Height", np.nan),
                "TM_Market value": format_financial(mv_final, "€"),
                "TM_Market_Value_Numeric": mv_val,
                "MV_Raw": mv_val,
                "MV_Clean": mv_clean,
                "MV_Final": mv_final,
                "MV_Was_Estimated": mv_was_estimated,
                "Contract": contract_raw,
                "On loan": r.get("On loan", ""),

                "Performance Score": performance_score,
                "Compatibility Score": compatibility_score,
                "Financial Score": financial_score,
                "Recommendation": recommendation,
                "Transfer Probability %": round(float(tp), 1),

                "Upgrade vs Team": format_upgrade_vs_team(impact_delta_vs_team_avg),
                "Upgrade Level": _upgrade_label(impact_delta_vs_team_avg),
                "Player Impact": round(player_impact, 2) if pd.notna(player_impact) else np.nan,
                "Impact Delta vs Team Avg": impact_delta_vs_team_avg,
                "Impact Delta vs Best Player": impact_delta_vs_best_player,
                "Impact Delta vs Weakest Player": impact_delta_vs_weakest_player,
                "Positive Delta vs Team Avg": positive_delta_vs_team_avg,
                "Negative Delta vs Team Avg": negative_delta_vs_team_avg,

                "Role Fit Score": subjective_role_fit_info["Role Fit Score"],
                "Best Team Fit Role": subjective_role_fit_info["Best Team Fit Role"],
                "Similarity To Target Player %": similarity_info["Similarity To Target Player %"],
                "Most Similar Target Player": similarity_info["Most Similar Target Player"],
                "Matched Role Slot": similarity_info["Matched Role Slot"],
                "BestRole": best_roles[i],
                "Role %": round(best_role_scores[i], 2),
                "TopRoles": top3_roles[i],
                "RoleMatches": role_dicts[i],
                "Top Team Fit Roles": subjective_role_fit_info["Top Team Fit Roles"],
                "Top Team Demanded Roles": subjective_role_fit_info["Top Team Demanded Roles"],
                "Player Top Roles Detailed": subjective_role_fit_info["Player Top Roles Detailed"],
                "Second Similar Target Player": similarity_info["Second Similar Target Player"],
                "Second Similarity %": similarity_info["Second Similarity %"],
                "Top Target Player Similarities": similarity_info["Top Target Player Similarities"],

                "Perf vs Team %": round(perf_team_pct[i], 1),
                "Perf vs Own League %": round(perf_own[i], 1),
                "Perf vs TargetLeague %": round(perf_target_pct[i], 1),

                "Age Fit": age_fit,
                "MV Fit": mv_fit,
                "Contract Fit %": round(contract_fit * 100, 1),
                "Hist Country Match": round(country_match, 3),

                "Player Score": player_score,
                "Score": round(raw_score[i], 2),
                "Composite Score": round(composite[i], 2),

                "Player Impact Raw": round(player_impact_raw, 4) if pd.notna(player_impact_raw) else np.nan,
                "Player Impact Positive": round(player_impact_positive, 4) if pd.notna(player_impact_positive) else np.nan,
                "Player Impact Negative": round(player_impact_negative, 4) if pd.notna(player_impact_negative) else np.nan,
                "Impact Reliability": r.get("Impact Reliability", ""),

                "Target Team": target_team,
                "Target Position": pos,
                "Target Team Pos Avg Impact": round(target_team_pos_avg_impact, 2) if pd.notna(target_team_pos_avg_impact) else np.nan,
                "Target Team Best Impact": round(target_team_best_impact, 2) if pd.notna(target_team_best_impact) else np.nan,
                "Target Team Weakest Impact": round(target_team_weakest_impact, 2) if pd.notna(target_team_weakest_impact) else np.nan,
                "Target Team Pos Avg Positive": round(target_team_pos_avg_positive, 2) if pd.notna(target_team_pos_avg_positive) else np.nan,
                "Target Team Pos Avg Negative": round(target_team_pos_avg_negative, 2) if pd.notna(target_team_pos_avg_negative) else np.nan,
                "Target Team Pos Player Count": target_team_pos_player_count,

                "Squad Role": squad_role,
                "Target_Club": target_team,
                "Target_League": target_league,
                "TM_Agent name": r.get("TM_Agent name", ""),
                "TM_Agent link": r.get("TM_Agent link", ""),
                "TM_Agent total market value": format_financial(
                    parse_agent_mv_plain(r.get("TM_Agent total market value", "")), "€"
                ),
                "TM_Player URL": r.get("TM_Player URL", r.get("Player URL", ""))
            }

            for pos_key, comp_cols in POSITION_COMPONENT_MAP.items():
                for comp_col in comp_cols:
                    row_dict[comp_col] = r.get(comp_col, np.nan)

            for comp_col in POSITION_COMPONENT_MAP.get(pos, []):
                target_avg_col = _target_avg_col_from_component(comp_col)
                delta_col = _delta_col_from_component(comp_col)

                target_avg_val = np.nan
                if not pos_ref.empty and target_avg_col in pos_ref.columns:
                    target_avg_val = _safe_num(pos_ref[target_avg_col].iloc[0], np.nan)
                elif pos in ["LW", "RW"]:
                    winger_ref = target_ref[target_ref["Target Position"].isin(["LW", "RW"])]
                    if not winger_ref.empty and target_avg_col in winger_ref.columns:
                        target_avg_val = _safe_num(winger_ref[target_avg_col].mean(), np.nan)

                player_comp_val = _safe_num(r.get(comp_col, np.nan), np.nan)
                delta_val = round(player_comp_val - target_avg_val, 2) if pd.notna(player_comp_val) and pd.notna(target_avg_val) else np.nan

                row_dict[target_avg_col] = round(target_avg_val, 2) if pd.notna(target_avg_val) else np.nan
                row_dict[delta_col] = delta_val

            row_dict["Biggest Upgrade Area"] = get_biggest_upgrade_area_for_row(row_dict, pos)

            rows.append(row_dict)

    shortlist = pd.DataFrame(rows)
    if shortlist.empty:
        if verbose:
            print(f"⚠️ No shortlist rows built for {target_team} ({position_filter})")
        return shortlist

    shortlist = (
        shortlist
        .sort_values(
            ["Performance Score", "Compatibility Score", "Financial Score", "Score", "Impact Delta vs Team Avg"],
            ascending=[False, False, False, False, False]
        )
        .drop_duplicates("Player", keep="first")
        .head(top_n)
    )

    if verbose:
        print(f"✅ Shortlist built: {len(shortlist)} players for {target_team} ({position_filter})")

    return shortlist


# In[ ]:


# ============================================================
# POSITION RECLASSIFIER — Final version
# Paste this BEFORE your export cell
# ============================================================

WYS_RAW_TO_NORMALISED = {
    # Wide attackers — these are the key ones
    "LAMF": "LW",  "RAMF": "RW",
    "LWF":  "LW",  "RWF":  "RW",
    "LW":   "LW",  "RW":   "RW",
    # Forwards
    "CF":   "CF",  "FWD":  "CF",  "SS":   "CF",
    # Central attacking mid
    "AMF":  "AMF", "AM":   "AMF",
    # Central mids
    "LCMF": "CM",  "RCMF": "CM",  "CMF":  "CM",
    # Defensive mids
    "LDMF": "DMF", "RDMF": "DMF", "DMF":  "DMF", "CDM": "DMF",
    # Full backs
    "LB":   "LB",  "LWB":  "LB",
    "RB":   "RB",  "RWB":  "RB",
    # Centre backs
    "CB":   "CB",  "LCB":  "CB",  "RCB":  "CB",
    "GK":   "GK",
}

ATTACKING_CODES = {"LW", "RW", "AMF", "CF", "CM"}

# When Main_Position says this, trust it over WYS logic
MAIN_POS_TRUST_MAP = {
    "RW": "RW", "LW": "LW", "RWF": "RW", "LWF": "LW",
    "RAMF": "RW", "LAMF": "LW",
    "CF": "CF", "FWD": "CF",
    "AMF": "AMF", "AM": "AMF",
    "DM": "DMF", "RDMF": "DMF", "LDMF": "DMF",
    "LCMF": "CM", "RCMF": "CM",
}


def parse_wys_counts(raw: str) -> dict:
    """Parse 'RAMF, RW, RDMF' → {'RW': 2, 'DMF': 1}"""
    if not isinstance(raw, str) or not raw.strip():
        return {}
    counts = {}
    for p in [x.strip().upper() for x in raw.replace(";", ",").split(",")]:
        mapped = WYS_RAW_TO_NORMALISED.get(p)
        if mapped:
            counts[mapped] = counts.get(mapped, 0) + 1
    return counts


def pick_best_position(counts: dict, main_pos: str = "") -> str:
    """
    Rules (in order):
    1. Drop LB/RB/CB when attacking codes present
    2. CF dominates if strictly more than any other
    3. Winger STRICTLY more than AMF → reclassify
    4. Tie between winger and AMF → use Main_Position as tiebreaker
    5. Pure winger (no AMF at all) → reclassify
    6. CM/DMF only when no winger/AMF present
    7. Fallback → AMF
    """
    if not counts:
        return "AMF"

    # Rule 1: drop defensive pos if attacking present
    if any(k in ATTACKING_CODES for k in counts):
        counts = {k: v for k, v in counts.items()
                  if k not in {"LB", "RB", "CB"}}

    if not counts:
        return "AMF"

    amf = counts.get("AMF", 0)
    lw  = counts.get("LW",  0)
    rw  = counts.get("RW",  0)
    cf  = counts.get("CF",  0)
    cm  = counts.get("CM",  0)
    dmf = counts.get("DMF", 0)

    # Rule 2: CF strictly dominates
    if cf > amf and cf >= lw and cf >= rw:
        return "CF"

    # Rule 3: winger STRICTLY more than AMF
    if lw > amf and lw >= rw:
        return "LW"
    if rw > amf and rw > lw:
        return "RW"

    # Rule 4: tie winger/AMF → use Main_Position as tiebreaker
    if amf > 0 and (lw == amf or rw == amf):
        main_mapped = MAIN_POS_TRUST_MAP.get(str(main_pos).strip().upper())
        if main_mapped in ("LW", "RW", "CF"):
            return main_mapped
        return "AMF"  # genuine AMF/winger hybrid → keep AMF

    # Rule 5: pure winger (AMF=0)
    if lw > 0 and amf == 0 and lw >= rw:
        return "LW"
    if rw > 0 and amf == 0 and rw > lw:
        return "RW"

    # Rule 6: CM/DMF only when no winger/AMF
    if cm > 0 and amf == 0 and lw == 0 and rw == 0:
        return "CM"
    if dmf > 0 and amf == 0 and lw == 0 and rw == 0:
        return "DMF"

    return "AMF"


def reclassify_positions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reclassify positions using WYS Position + Main_Position as tiebreaker.
    Updates both Position and Main_Position columns.
    """
    df = df.copy()

    wys_col  = next((c for c in ["WYS Position","Wys Position",
                                  "wys_position","Positions"] if c in df.columns), None)
    main_col = next((c for c in ["Main_Position","Main Position"] if c in df.columns), None)

    if wys_col is None:
        print("⚠️  WYS Position column not found — skipping")
        print(f"   Columns with 'pos': {[c for c in df.columns if 'pos' in c.lower()]}")
        return df

    print(f"   WYS column  : '{wys_col}'")
    print(f"   Main column : '{main_col or 'not found'}'")

    before = df["Position"].value_counts().to_dict()
    changed = 0

    for idx, row in df.iterrows():
        counts   = parse_wys_counts(row.get(wys_col, ""))
        main_pos = str(row.get(main_col, "")) if main_col else ""
        new_pos  = pick_best_position(counts, main_pos)

        if new_pos != str(row.get("Position", "")):
            df.at[idx, "Position"] = new_pos
            if "Main_Position" in df.columns:
                df.at[idx, "Main_Position"] = new_pos
            changed += 1

    after = df["Position"].value_counts().to_dict()

    print(f"\n   ✅ {changed} players reclassified")
    print(f"\n   {'Position':<8} {'Before':>8} {'After':>8} {'Diff':>8}")
    print(f"   {'-'*32}")
    for p in sorted(set(list(before.keys()) + list(after.keys()))):
        b = before.get(p, 0)
        a = after.get(p, 0)
        d = a - b
        arrow = f"+{d}" if d > 0 else str(d) if d != 0 else "—"
        print(f"   {p:<8} {b:>8,} {a:>8,} {arrow:>8}")

    return df


# In[ ]:


# ============================================================
# GetScouted — CF EXPORT (COMPLETE STANDALONE CELL)
# Paste this entire block as ONE cell after your model code
# Runs precomputation + CF scoring in one go
# ============================================================

import time
import pandas as pd
import numpy as np
from pathlib import Path

# ── CONFIG ────────────────────────────────────────────────────────────────
SEASON         = "2025-2026"
OUTPUT_DIR     = Path("getscout_export")
POSITIONS      = ["GK", "CB", "LB", "RB", "CM", "DMF", "AMF", "LW", "RW", "CF"]
TOP_N          = 999999          # no cap — all players included
AGE_MIN        = 17
AGE_MAX        = 35
MV_MIN         = 0
MV_MAX         = 200_000_000
PERF_THRESHOLD = 0.0
INCLUDE_SIM    = False   # set True later — slower but adds similarity cols
SKIP_EXISTS    = True    # skip positions already exported
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── POSITION RECLASSIFIER ─────────────────────────────────────────────────
WYS_RAW_MAP = {
    "LAMF":"LW",  "RAMF":"RW",
    "LWF": "LW",  "RWF": "RW",
    "LW":  "LW",  "RW":  "RW",
    "CF":  "CF",  "FWD": "CF",  "SS":  "CF",
    "AMF": "AMF", "AM":  "AMF",
    "LCMF":"CM",  "RCMF":"CM",  "CMF": "CM",
    "LDMF":"DMF", "RDMF":"DMF", "DMF": "DMF", "CDM":"DMF",
    "LB":  "LB",  "LWB": "LB",
    "RB":  "RB",  "RWB": "RB",
    "CB":  "CB",  "LCB": "CB",  "RCB": "CB",
    "GK":  "GK",
}

MAIN_TRUST = {
    "RW":"RW","LW":"LW","RWF":"RW","LWF":"LW",
    "RAMF":"RW","LAMF":"LW","CF":"CF","FWD":"CF",
    "AMF":"AMF","AM":"AMF","DM":"DMF","RDMF":"DMF",
    "LDMF":"DMF","LCMF":"CM","RCMF":"CM",
}

ATTACKING = {"LW","RW","AMF","CF","CM"}


def _parse_wys(raw):
    if not isinstance(raw, str): return {}
    counts = {}
    for p in [x.strip().upper() for x in raw.replace(";",",").split(",")]:
        m = WYS_RAW_MAP.get(p)
        if m: counts[m] = counts.get(m,0) + 1
    return counts


def _pick_pos(counts, main_pos=""):
    if not counts: return "AMF"
    if any(k in ATTACKING for k in counts):
        counts = {k:v for k,v in counts.items() if k not in {"LB","RB","CB"}}
    if not counts: return "AMF"

    amf = counts.get("AMF",0)
    lw  = counts.get("LW", 0)
    rw  = counts.get("RW", 0)
    cf  = counts.get("CF", 0)
    cm  = counts.get("CM", 0)
    dmf = counts.get("DMF",0)

    # CF strictly dominates
    if cf > amf and cf >= lw and cf >= rw: return "CF"
    # winger strictly more than AMF
    if lw > amf and lw >= rw: return "LW"
    if rw > amf and rw >  lw: return "RW"
    # tie winger/AMF → use Main_Position as tiebreaker
    if amf > 0 and (lw == amf or rw == amf):
        m = MAIN_TRUST.get(str(main_pos).strip().upper())
        if m in ("LW","RW","CF"): return m
        return "AMF"
    # pure winger (no AMF)
    if lw > 0 and amf == 0 and lw >= rw: return "LW"
    if rw > 0 and amf == 0 and rw >  lw: return "RW"
    # CM/DMF only when no winger/AMF
    if cm  > 0 and amf == 0 and lw == 0 and rw == 0: return "CM"
    if dmf > 0 and amf == 0 and lw == 0 and rw == 0: return "DMF"
    return "AMF"


# Positions that should NEVER be changed by the reclassifier
PROTECTED_POSITIONS = {"GK", "CB", "LB", "RB", "CM", "DMF", "CF", "LW", "RW"}

def reclassify_positions(df):
    df = df.copy()
    wys_col  = next((c for c in ["WYS Position","Wys Position","wys_position","Positions"] if c in df.columns), None)
    main_col = next((c for c in ["Main_Position","Main Position"] if c in df.columns), None)
    if wys_col is None:
        print("⚠️  WYS Position column not found — skipping reclassification")
        return df

    changed = 0
    for idx, row in df.iterrows():
        current_pos = str(row.get("Position","")).strip()

        # ONLY reclassify players already coded as AMF
        # All other positions (GK, CB, LB, RB, CM, DMF, LW, RW, CF) are kept as-is
        if current_pos != "AMF":
            continue

        counts  = _parse_wys(row.get(wys_col,""))
        main_p  = str(row.get(main_col,"")) if main_col else ""
        new_pos = _pick_pos(counts, main_p)

        if new_pos != current_pos:
            df.at[idx,"Position"] = new_pos
            if "Main_Position" in df.columns:
                df.at[idx,"Main_Position"] = new_pos
            changed += 1

    print(f"   ✅ {changed} AMF players reclassified to correct position")
    print(f"   Position breakdown after reclassification:")
    for pos, cnt in df["Position"].value_counts().sort_values(ascending=False).items():
        print(f"      {pos:<6} {cnt:>5,}")
    return df


# ── COLUMN RENAME MAP  (pipeline → Supabase schema) ───────────────────────
RENAME_MAP = {
    "UniqueID":"unique_id","Player":"player","Current_Team":"current_team","League":"league",
    "Season":"season","Position":"position","Age":"age","Minutes":"minutes",
    "Height":"height","TM_Market_Value":"tm_market_value","MV_Numeric":"mv_numeric",
    "Contract":"contract","On_Loan":"on_loan",
    "Target_Club":"target_club","Target_League":"target_league",
    "Target_Position":"target_position",
    "Performance_Score":"performance_score","Compatibility_Score":"compatibility_score",
    "Financial_Score":"financial_score","Recommendation":"recommendation",
    "Transfer_Probability":"transfer_probability",
    "Player_Impact":"player_impact",
    "Impact_Delta_vs_Team_Avg":"impact_delta_vs_team_avg",
    "Impact_Delta_vs_Best":"impact_delta_vs_best",
    "Impact_Delta_vs_Weakest":"impact_delta_vs_weakest",
    "Positive_Delta_vs_Team_Avg":"positive_delta_vs_team_avg",
    "Negative_Delta_vs_Team_Avg":"negative_delta_vs_team_avg",
    "Upgrade_Level":"upgrade_level","Biggest_Upgrade_Area":"biggest_upgrade_area",
    "Target_Team_Avg_Impact":"target_team_avg_impact",
    "Target_Team_Best_Impact":"target_team_best_impact",
    "Target_Team_Worst_Impact":"target_team_worst_impact",
    "Target_Team_Player_Count":"target_team_player_count",
    "Perf_vs_Team_%":"perf_vs_team_pct",
    "Perf_vs_Own_League_%":"perf_vs_own_league_pct",
    "Perf_vs_Target_League_%":"perf_vs_target_league_pct",
    "Age_Fit":"age_fit","MV_Fit":"mv_fit","Contract_Fit_%":"contract_fit_pct",
    "Squad_Role":"squad_role","Best_Role":"best_role","Role_%":"role_pct",
    "Top_3_Roles":"top_3_roles","Role_Fit_Score":"role_fit_score",
    "Best_Team_Fit_Role":"best_team_fit_role",
    "Top_Team_Demanded_Roles":"top_team_demanded_roles",
    "Most_Similar_Target_Player":"most_similar_target_player",
    "Similarity_To_Target_Player_%":"similarity_to_target_pct",
    "Second_Similar_Player":"second_similar_player",
    "Second_Similarity_%":"second_similarity_pct",
    "Agent_Name":"agent_name","Agent_Link":"agent_link","Player_URL":"player_url",
    "Impact_Raw":"impact_raw","Impact_Positive":"impact_positive",
    "Impact_Negative":"impact_negative","Impact_Reliability":"impact_reliability",
}


# ── HELPERS ────────────────────────────────────────────────────────────────
def _sn(v, d=0.0):
    try:
        return d if pd.isna(v) else float(v)
    except: return d

def _fmt_mv(v, c="€"):
    try:
        if pd.isna(v): return ""
        v = float(v)
        if abs(v)>=1e9: return f"{c}{v/1e9:.1f}bn"
        if abs(v)>=1e6: return f"{c}{v/1e6:.1f}m"
        if abs(v)>=1e3: return f"{c}{v/1e3:.0f}k"
        return f"{c}{v:,.0f}"
    except: return ""

def _upgrade(d):
    if pd.isna(d): return ""
    if d>=15: return "Strong Upgrade"
    if d>=8:  return "Upgrade"
    if d>=3:  return "Marginal Upgrade"
    if d>=-3: return "Similar Level"
    return "Below Current Level"

def _rec(p,c,f):
    if any(pd.isna(x) for x in [p,c,f]): return "Incomplete Profile"
    if p>=85 and c>=80 and f>=65: return "Elite Target"
    if p>=75 and c>=72 and f>=55: return "Strong Target"
    if p>=68 and c>=65 and f>=45: return "Good Target"
    if p>=60 and c>=58:           return "Situational Target"
    return "Watchlist"

def _avg(*vals):
    v = [float(x) for x in vals if pd.notna(x) and x!=""]
    return round(sum(v)/len(v),2) if v else np.nan

def _clip(x,lo=0,hi=100):
    try: return float(np.clip(float(x),lo,hi))
    except: return np.nan

def _fit_score(label):
    return {"Great Fit":100,"Moderate Fit":60,"Poor Fit":20}.get(label, np.nan)

def _clean_df(df):
    df = df.copy()
    for col in df.select_dtypes(include=[np.floating]).columns:
        df[col] = df[col].replace([np.inf,-np.inf], np.nan)
    return df.fillna("")


# ══════════════════════════════════════════════════════════════════════════
# STEP 1 — Pre-compute everything ONCE
# ══════════════════════════════════════════════════════════════════════════
print("="*60)
print(f"  GetScouted Export  |  Season: {SEASON}")
print(f"  Output: {OUTPUT_DIR}")
print("="*60)
print("\n⚙️  Pre-computing (once for all positions) ...")

_df = _rename_columns_safe(players_df.copy())
_df = prepare_optional_transfer_fields(_df)
_df["Season"] = _df["Season"].astype(str).str.strip()

if "League" in _df.columns:
    _known = sorted(_df["League"].dropna().astype(str).unique())
    _df["League"] = _df["League"].apply(
        lambda x: normalize_league_name(x, known_targets=_known, use_fuzzy=False)
        if pd.notna(x) else x
    )

if "Position" in _df.columns:
    _df["Position"] = _df["Position"].apply(normalise_position)
if "Main_Position" not in _df.columns and "Position" in _df.columns:
    _df["Main_Position"] = _df["Position"]

# reclassify positions using WYS Position data
print("⚙️  Reclassifying positions ...")
_df = reclassify_positions(_df)
_df["Main_Position"] = _df["Position"]

# market value parsing
def _pmv(val):
    if pd.isna(val): return np.nan
    r = pd.to_numeric(val, errors="coerce")
    if pd.notna(r) and r > 0: return float(r)
    try:
        v = str(val).lower().replace("€","").replace("£","").strip()
        if "bn" in v: return float(v.replace("bn",""))*1e9
        if "m"  in v: return float(v.replace("m","")) *1e6
        if "k"  in v: return float(v.replace("k","")) *1e3
        return float(v)
    except: return np.nan

_tm = "TM_Market value" if "TM_Market value" in _df.columns else None
_wy = next((c for c in ["Market value_TM","Market value","Market_Value",
                          "TM_Market_Value_Numeric"] if c in _df.columns), None)
if _tm:
    _tp = _df[_tm].apply(_pmv)
    _df["MV_Raw"] = _tp.where(_tp.notna(), _df[_wy].apply(_pmv) if _wy else np.nan)
elif _wy:
    _df["MV_Raw"] = _df[_wy].apply(_pmv)
else:
    _df["MV_Raw"] = np.nan

_df["MV_Clean"] = _df["MV_Raw"].where(_df["MV_Raw"] > 0)
_lpm = _df.groupby(["League","Position"])["MV_Clean"].median()
_pm  = _df.groupby("Position")["MV_Clean"].median()
_om  = _df["MV_Clean"].median()

def _fill_mv(row):
    if pd.notna(row["MV_Clean"]): return row["MV_Clean"]
    k = (row.get("League"), row.get("Position"))
    if k in _lpm.index and pd.notna(_lpm[k]): return _lpm[k]
    p = row.get("Position")
    if p in _pm.index and pd.notna(_pm[p]): return _pm[p]
    return _om

_df["MV_Final"]         = _df.apply(_fill_mv, axis=1)
_df["MV_Was_Estimated"] = _df["MV_Clean"].isna()

print("⚙️  Computing Player Impact scores ...")
_df = add_player_impact(_df)
print("   ✅ Player Impact done")

# season window
_start = _season_start_int(SEASON)
_df["_season_start"] = _df["Season"].apply(_season_start_int)
_recent  = _df[_df["_season_start"].between(_start-2, _start)].copy()
_current = _recent[_recent["Season"] == SEASON].copy()
print(f"   Season rows : {len(_current):,}  |  Teams : {_current['Team'].nunique()}")

# filter to teams with at least 5 players — removes data-sparse clubs
_team_counts = _current["Team"].value_counts()
_valid_teams  = _team_counts[_team_counts >= 5].index
_current      = _current[_current["Team"].isin(_valid_teams)].copy()
print(f"   Teams after min-5-player filter : {_current['Team'].nunique()}")

# team position reference — pandas 1.3 compatible version
def _build_tpr(df, team_col="Team", position_col="Position"):
    rows = []
    df_clean = df.dropna(subset=["Player Impact"]).copy()
    all_comp_cols = sorted({c for cols in POSITION_COMPONENT_MAP.values() for c in cols})
    for (team, pos), grp in df_clean.groupby([team_col, position_col], dropna=False):
        row = {
            team_col:                  team,
            position_col:              pos,
            "team_pos_avg_impact":     grp["Player Impact"].mean(),
            "team_pos_best_impact":    grp["Player Impact"].max(),
            "team_pos_weakest_impact": grp["Player Impact"].min(),
            "team_pos_avg_positive":   grp["Player Impact Positive"].mean()
                                       if "Player Impact Positive" in grp.columns else np.nan,
            "team_pos_avg_negative":   grp["Player Impact Negative"].mean()
                                       if "Player Impact Negative" in grp.columns else np.nan,
            "team_pos_player_count":   len(grp),
        }
        for cc in all_comp_cols:
            if cc in grp.columns:
                row[f"team_pos_avg_{_comp_short_name(cc)}"] = grp[cc].mean()
        rows.append(row)
    return pd.DataFrame(rows)

# deduplicate columns — fixes "cannot reindex from a duplicate axis" error
# happens when Wyscout exports contain repeated column names
_recent  = _recent.loc[:, ~_recent.columns.duplicated()].copy()
_current = _current.loc[:, ~_current.columns.duplicated()].copy()
print(f"   Columns after dedup : {len(_recent.columns)}")

_tpr = _build_tpr(_recent, team_col="Team", position_col="Position")

# metric cache per position
_mc = {}
for _p in POSITIONS:
    _ms = [m for m in POSITION_METRICS.get(_p,[]) if m in _recent.columns]
    if not _ms: continue
    _pd2 = _recent[_recent["Position"] == _p].copy()
    if _pd2.empty: continue
    # dedup within position slice too
    _pd2 = _pd2.loc[:, ~_pd2.columns.duplicated()]
    _ms  = [m for m in _ms if m in _pd2.columns]
    if not _ms: continue
    _mc[_p] = {"metrics": _ms, "league_means": _pd2.groupby("League")[_ms].mean()}

# transfer cache per team
_tc = {}
if transfers_df is not None and not transfers_df.empty:
    for _t in _current["Team"].dropna().unique():
        try:
            _, _, _perm, _ = club_transfer_profile(transfers_df, _t, last_n_years=5)
            _tc[_t] = {
                "avg_age": _perm["Age"].mean()          if not _perm.empty and "Age"          in _perm.columns else np.nan,
                "avg_mv":  _perm["Market_Value"].mean() if not _perm.empty and "Market_Value"  in _perm.columns else np.nan,
            }
        except:
            _tc[_t] = {"avg_age": np.nan, "avg_mv": np.nan}

_ts = standardize_team_style_columns(team_styles_df) if team_styles_df is not None else None

CACHE = {
    "recent": _recent, "current": _current,
    "tpr": _tpr, "mc": _mc, "tc": _tc,
    "ts": _ts, "season": SEASON,
}
print("✅  Pre-computation complete\n")




def _score_position_fast(pos):
    current = _current
    recent  = _recent
    lw_map  = normalize_league_weights(league_weights)

    if pos not in _mc:
        print(f"❌ '{pos}' not in metric cache. Available: {list(_mc.keys())}")
        return pd.DataFrame()

    teams    = sorted(current["Team"].dropna().unique().tolist())
    pos_pool = current[current["Position"] == pos].copy().reset_index(drop=True)

    if pos_pool.empty:
        print(f"❌ No players found for position {pos}")
        return pd.DataFrame()

    metrics = [m for m in _mc[pos]["metrics"] if m in pos_pool.columns]
    if not metrics:
        print(f"❌ No metrics found for {pos}")
        return pd.DataFrame()

    lm   = _mc[pos]["league_means"]
    P    = pos_pool[metrics].fillna(0).to_numpy()   # (n_players, n_metrics)
    w    = np.ones(len(metrics))
    n    = len(pos_pool)

    # pre-compute league avg matrix for all players at once  (n_players, n_metrics)
    player_leagues = pos_pool["League"].tolist()
    LA = np.zeros((n, len(metrics)))
    for i, lg in enumerate(player_leagues):
        if lg in lm.index:
            LA[i] = lm.loc[lg, metrics].to_numpy()

    # pre-compute roles for all players once
    all_br, all_bs, all_t3 = [], [], []
    for _, r in pos_pool.iterrows():
        br, bs, rd = extract_playing_style_from_dataset(r, pos)
        all_br.append(br)
        all_bs.append(bs)
        all_t3.append([k for k,_ in sorted(rd.items(), key=lambda x:x[1], reverse=True)[:3]])

    all_br = np.array(all_br, dtype=object)
    all_bs = np.array(all_bs, dtype=float)

    # league weights per player  (n_players,)
    lw_arr = np.array([lw_map.get(lg, 0.75) for lg in player_leagues])

    # p_own — vectorised: (n_players,)
    p_own_global = (((P > LA) * w).sum(1) / w.sum()) * 100

    all_rows = []
    t_log    = time.time()

    for t_idx, team in enumerate(teams):
        if t_idx % 50 == 0 and t_idx > 0:
            elapsed = time.time() - t_log
            print(f"   {t_idx}/{len(teams)} teams done  ({elapsed:.0f}s so far) ...")

        ref = _tpr[(_tpr["Team"] == team) & (_tpr["Position"] == pos)]
        if ref.empty:
            continue
        ref_row = ref.iloc[0]

        t_avg   = _sn(ref_row.get("team_pos_avg_impact"),     np.nan)
        t_best  = _sn(ref_row.get("team_pos_best_impact"),    np.nan)
        t_worst = _sn(ref_row.get("team_pos_weakest_impact"), np.nan)
        t_avg_p = _sn(ref_row.get("team_pos_avg_positive"),   np.nan)
        t_avg_n = _sn(ref_row.get("team_pos_avg_negative"),   np.nan)
        t_count = _sn(ref_row.get("team_pos_player_count"),   np.nan)

        comp_avgs = {cc: _sn(ref_row.get(f"team_pos_avg_{_comp_short_name(cc)}", np.nan), np.nan)
                     for cc in POSITION_COMPONENT_MAP.get(pos, [])}

        atc     = _tc.get(team, {})
        avg_age = atc.get("avg_age", np.nan)
        avg_mv  = atc.get("avg_mv",  np.nan)

        tl_row  = recent[(recent["Team"] == team) & (recent["Position"] == pos)]
        tl      = tl_row["League"].iloc[0] if not tl_row.empty else ""

        club_pos = recent[(recent["Team"] == team) & (recent["Position"] == pos)]
        team_avg = club_pos.reindex(columns=metrics, fill_value=0).mean().to_numpy()                    if not club_pos.empty else np.zeros(len(metrics))
        tl_avg   = lm.loc[tl, metrics].to_numpy()                    if tl and tl in lm.index else np.zeros(len(metrics))

        # filter mask — exclude this team's own players + age/mv filter
        excl   = pos_pool["Team"] != team
        age_ok = pos_pool["Age"].between(AGE_MIN, AGE_MAX)
        mv_ok  = pos_pool["MV_Final"].between(MV_MIN, MV_MAX)
        mask   = (excl & age_ok & mv_ok).to_numpy()

        if mask.sum() == 0:
            continue

        P_f     = P[mask]                        # (n_pool, n_metrics)
        p_own_f = p_own_global[mask]             # (n_pool,)
        lw_f    = lw_arr[mask]                   # (n_pool,)
        br_f    = all_br[mask]
        bs_f    = all_bs[mask]
        t3_f    = [all_t3[i] for i, m in enumerate(mask) if m]
        pool    = pos_pool[mask].reset_index(drop=True)

        # vectorised scoring — (n_pool,)
        p_team   = (((P_f > team_avg) * w).sum(1) / w.sum()) * 100
        p_target = (((P_f > tl_avg  ) * w).sum(1) / w.sum()) * 100
        raw_s    = ((p_team + p_own_f + p_target) / 3) * lw_f

        rfit_cache = {}
        if _ts is not None:
            try:
                rfit_cache[team] = calculate_subjective_role_fit_for_player_to_team(
                    pool.iloc[0], team, _ts)
            except:
                rfit_cache[team] = {"Role Fit Score": np.nan, "Best Team Fit Role": "",
                                    "Top Team Demanded Roles": ""}

        for i, (_, r) in enumerate(pool.iterrows()):
            pi   = _sn(r.get("Player Impact",          np.nan), np.nan)
            iraw = _sn(r.get("Player Impact Raw",       np.nan), np.nan)
            ipos = _sn(r.get("Player Impact Positive",  np.nan), np.nan)
            ineg = _sn(r.get("Player Impact Negative",  np.nan), np.nan)

            da = round(pi - t_avg,   2) if pd.notna(pi) and pd.notna(t_avg)   else np.nan
            db = round(pi - t_best,  2) if pd.notna(pi) and pd.notna(t_best)  else np.nan
            dw = round(pi - t_worst, 2) if pd.notna(pi) and pd.notna(t_worst) else np.nan
            dp = round(ipos - t_avg_p, 2) if pd.notna(ipos) and pd.notna(t_avg_p) else np.nan
            dn = round(ineg - t_avg_n, 2) if pd.notna(ineg) and pd.notna(t_avg_n) else np.nan

            af  = classify_age_fit(r["Age"], avg_age)
            mvf = classify_fit(r.get("MV_Final", np.nan), avg_mv,
                               avg_mv * 0.25, avg_mv * 0.5) if pd.notna(avg_mv) else "Unknown"

            cr = r.get("TM_Contract", r.get("Contract_Final",
                 r.get("Contract", r.get("Contract expires", None))))
            try:
                ey  = pd.to_datetime(cr, errors="coerce", dayfirst=True).year
                cur = int(str(SEASON).split("-")[-1])
                cf  = 1.0 if ey-cur<=1 else 0.7 if ey-cur==2 else 0.4 if ey-cur==3 else 0.1
            except:
                cf = 0.5

            try:    mr = r["Minutes"] / max(club_pos["Minutes"].mean(), 1)
            except: mr = 0
            sr = ("Important Player" if mr>=0.8 else "Regular Starter" if mr>=0.6
                  else "Squad Player" if mr>=0.3 else "Fringe Player"   if mr>=0.1
                  else "Out-of-Favour")

            rfit = rfit_cache.get(team, {"Role Fit Score": np.nan,
                                          "Best Team Fit Role": "",
                                          "Top Team Demanded Roles": ""})

            ps = _avg(_clip(pi), _clip(p_team[i]), _clip(p_target[i]), _clip(p_own_f[i]),
                      _clip(50 + 2*da) if pd.notna(da) else np.nan)
            cs = _avg(_clip(rfit.get("Role Fit Score", np.nan)),
                      100.0 if rfit.get("Best Team Fit Role","") == br_f[i]
                              and br_f[i] not in [None,""] else 70.0)
            fs = _avg(_fit_score(af), _fit_score(mvf))
            tp = (0.30*(cs/100) + 0.20*(ps/100) + 0.20*(fs/100) + 0.30*cf) * 100

            row = {
                "unique_id":            r["UniqueID"],
                "player":               r["Player"],
                "current_team":         r.get("Team",""),
                "league":               r.get("League",""),
                "season":               r.get("Season", SEASON),
                "position":             pos,
                "age":                  r.get("Age"),
                "minutes":              r.get("Minutes"),
                "height":               r.get("Height", np.nan),
                "tm_market_value":      _fmt_mv(r.get("MV_Final", np.nan)),
                "mv_numeric":           r.get("MV_Final", np.nan),
                "contract":             cr,
                "on_loan":              r.get("On loan",""),
                "target_club":          team,
                "target_league":        tl,
                "target_position":      pos,
                "performance_score":    ps,
                "compatibility_score":  cs,
                "financial_score":      fs,
                "recommendation":       _rec(ps, cs, fs),
                "transfer_probability": round(float(tp), 1),
                "player_impact":        round(pi, 2)   if pd.notna(pi)   else np.nan,
                "impact_delta_vs_team_avg":   da,
                "impact_delta_vs_best":       db,
                "impact_delta_vs_weakest":    dw,
                "positive_delta_vs_team_avg": dp,
                "negative_delta_vs_team_avg": dn,
                "upgrade_level":        _upgrade(da),
                "target_team_avg_impact":   round(t_avg,   2) if pd.notna(t_avg)   else np.nan,
                "target_team_best_impact":  round(t_best,  2) if pd.notna(t_best)  else np.nan,
                "target_team_worst_impact": round(t_worst, 2) if pd.notna(t_worst) else np.nan,
                "target_team_player_count": t_count,
                "perf_vs_team_pct":         round(p_team[i],    1),
                "perf_vs_own_league_pct":   round(p_own_f[i],   1),
                "perf_vs_target_league_pct":round(p_target[i],  1),
                "age_fit":              af,
                "mv_fit":               mvf,
                "contract_fit_pct":     round(cf * 100, 1),
                "squad_role":           sr,
                "best_role":            br_f[i],
                "role_pct":             round(float(bs_f[i]), 2),
                "top_3_roles":          " | ".join(t3_f[i]),
                "role_fit_score":       rfit.get("Role Fit Score", np.nan),
                "best_team_fit_role":   rfit.get("Best Team Fit Role",""),
                "top_team_demanded_roles": rfit.get("Top Team Demanded Roles",""),
                "agent_name":           r.get("TM_Agent name",""),
                "agent_link":           r.get("TM_Agent link",""),
                "player_url":           r.get("TM_Player URL", r.get("Player URL","")),
                "impact_raw":           round(iraw, 4) if pd.notna(iraw) else np.nan,
                "impact_positive":      round(ipos, 4) if pd.notna(ipos) else np.nan,
                "impact_negative":      round(ineg, 4) if pd.notna(ineg) else np.nan,
                "impact_reliability":   r.get("Impact Reliability",""),
            }

            for cc in POSITION_COMPONENT_MAP.get(pos, []):
                short   = _comp_short_name(cc)
                val     = _sn(r.get(cc, np.nan), np.nan)
                avg_val = comp_avgs.get(cc, np.nan)
                delta   = round(val - avg_val, 2) if pd.notna(val) and pd.notna(avg_val) else np.nan
                row[f"comp_{short}"]             = round(val,     4) if pd.notna(val)     else np.nan
                row[f"comp_{short}_target_avg"]  = round(avg_val, 4) if pd.notna(avg_val) else np.nan
                row[f"comp_{short}_delta"]        = delta

            all_rows.append(row)

    if not all_rows:
        return pd.DataFrame()

    return (
        pd.DataFrame(all_rows)
        .sort_values(["target_club", "performance_score"], ascending=[True, False])
        .groupby("target_club").head(TOP_N)
        .reset_index(drop=True)
    )

# EXPORT GROUPS 
# ==========================================
# EXPORT CONFIGURATION
# ==========================================

EXPORT_GROUPS = {

    "core": [
        "unique_id",
        "player",
        "current_team",
        "league",
        "season",
        "position",
        "age",
        "target_club",
        "target_league",
        "target_position",
        "performance_score",
        "compatibility_score",
        "financial_score",
        "recommendation",
        "transfer_probability"
    ],

    "impact": [
        "unique_id",
        "player",
        "target_club",
        "player_impact",
        "impact_delta_vs_team_avg",
        "impact_delta_vs_best_player",
        "impact_delta_vs_weakest_player",
        "positive_delta_vs_team_avg",
        "negative_delta_vs_team_avg",
        "upgrade_level",
        "target_team_pos_avg_impact",
        "target_team_best_impact",
        "target_team_weakest_impact",
        "target_team_pos_player_count",
        "impact_raw",
        "impact_positive",
        "impact_negative",
        "impact_reliability"
    ],

    "benchmark": [
        "unique_id",
        "player",
        "target_club",
        "perf_vs_team",
        "perf_vs_own_league",
        "perf_vs_target_league"
    ],

    "financial": [
        "unique_id",
        "player",
        "target_club",
        "tm_market_value",
        "mv_numeric",
        "contract",
        "on_loan",
        "age_fit",
        "mv_fit",
        "contract_fit"
    ],

    "roles": [
        "unique_id",
        "player",
        "target_club",
        "squad_role",
        "best_role",
        "role_pct",
        "top_roles",
        "role_fit_score",
        "best_team_fit_role",
        "top_team_fit_roles",
        "top_team_demanded_roles",
        "player_top_roles_detailed",
        "similarity_to_target_player",
        "most_similar_target_player",
        "matched_role_slot"
    ],

    "metadata": [
        "unique_id",
        "player",
        "target_club",
        "height",
        "minutes",
        "tm_agent_name",
        "tm_agent_link",
        "tm_agent_total_market_value",
        "tm_player_url"
    ]
}

#further defining the smaller files
from pathlib import Path

def export_group_files(df, position, output_dir):
    """
    Export grouped datasets for one position.
    """

    for group_name, columns in EXPORT_GROUPS.items():

        cols = [c for c in columns if c in df.columns]

        if not cols:
            print(f"⚠ Skipping {group_name} (no matching columns)")
            continue

        export_df = df[cols].copy()

        export_path = output_dir / f"{position}_{group_name}.csv"

        export_df.to_csv(export_path, index=False)

        print(f"      ✓ {export_path.name}")

# ── RUN ───────────────────────────────────────────────────────────────────
import time

safe_s = SEASON.replace("/", "_").replace("-", "_")
group_exports = {name: [] for name in EXPORT_GROUPS}
global_start_id = 1

for pos in POSITIONS:

    print("\n" + "="*70)
    print(f"Scoring {pos}")
    print("="*70)

    t0 = time.time()

    out_path = OUTPUT_DIR / f"{pos}_{safe_s}.csv"

    print(f"⚙️  Scoring all {pos}s vs all teams ...")
    print(f"   Teams  : {_current['Team'].nunique()}")
    print(f"   Players: {len(_current[_current['Position'] == pos]):,} {pos}s in pool\n")

    df_pos = _score_position_fast(pos)

    if df_pos.empty:
        print(f"⚠️  No rows generated for {pos}")
        continue

    df_pos = _clean_df(df_pos)

    #assigning recommendation ids to players- global 
    df_pos.insert(
        0,
        "recommendation_id",
        range(global_start_id, global_start_id + len(df_pos))
        )

    global_start_id += len(df_pos)

    df_pos.to_csv(out_path, index=False)

    # smaller files for each export group (core, impact, benchmark, financial, roles, metadata)
    export_group_files(
    df=df_pos,
    position=pos,
    output_dir=OUTPUT_DIR
    )

    #for all player_rec
    for group_name, columns in EXPORT_GROUPS.items():

        cols = [c for c in columns if c in df_pos.columns]

        if cols:
            group_exports[group_name].append(df_pos[cols].copy())
    
    for group_name, frames in group_exports.items():

        if not frames:
            continue

        combined = pd.concat(frames, ignore_index=True)

        combined.to_csv(
        OUTPUT_DIR / f"player_recommendations_{group_name}.csv",
        index=False
    )

    print(f"✓ player_recommendations_{group_name}.csv")


    elapsed = time.time() - t0

    print(f"\n✅ {pos} done — {len(df_pos):,} rows → {out_path.name} ({elapsed:.0f}s)")

    print("\n── Top 10 rows ──────────────────────────────────────────────")
    print(
        df_pos[
            [
                "unique_id",
                "player",
                "current_team",
                "target_club",
                "performance_score",
                "recommendation",
                "upgrade_level",
            ]
        ].head(10).to_string(index=False)
    )

    print("\n── Recommendation breakdown ─────────────────────────────────")

    print(df_pos["recommendation"].value_counts().to_string())

    print(f"\n── Teams covered : {df_pos['target_club'].nunique()}")
    print(f"   Saved to      : {out_path}")

print("\n🎉 All position exports completed.")

