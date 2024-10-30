## Getting Started

Below is a list of applications/tools required to configure and run the backend locally:

```
- Node.js (https://nodejs.org/en/download/)
Guides for installation of this are found on the same page (https://nodejs.org/en/download/).
```

### MongoDB Setup

The current configuration uses a cloud deployment of MongoDB (Atlas). The section below will demonstrate how to configure the connection URL to connect the API to the database.

### .env Configuration

By default, this application will pull both a JWT_SECRET and DB_URL from the .env file (file not included for security reasons). To setup a .env file, make a brand new file in the root folder called '.env'. Copy paste the below format and edit as necessary:

```
DB_URL=
JWT_SECRET=
```
Ensure that both values are filled, as the DB_URL is required to connect to the database instance, and JWT_SECRET is required for encoding/decoding the password strings

Without these values, you will not be able to connect to the DB instance, and JWT authentication will not function.

### Express.js Setup

In the root folder of the project (where this readme.md is located), open up a terminal or bash of choice, and run the following command:

```
npm install
```

After roughly 30 seconds, the Node package manager should have fetched and installed all the required dependancies for the project.

From here we can run the API by executing the following command:

```
npm start
```

The server runs nodemon, which will automatically restart when any modifications have been made to the project files. Any calls made to the API should appear in the console with the route used alongside the timestamp of when this was executed.

The API runs on port 3000, as defined in line 6 of index.js, if you wish to change what port this runs on, you can modify the port number on the index.js file.

To stop running the server, use the keybind 'Control + C' whilst the bash window running the API is in focus.

## Routes
Routes marked with an * do not require a bearer  token to access.

### User Routes
*POST /users/register - Requires a JSON body containing a 'username', 'password', 'email', 'fullname', 'role' and 'team'. Hashes and stores password, and returns user object upon sucessful creation

*POST /users/login - Requires a JSON body containing a 'username' and 'password' value. Upon successful authentication, returns a Bearer Token for authorization

GET /users/getUser - Gets details about the currently logged in user (pulled from Bearer Token)

### Shortlist Routes
GET /shortlists/getList - Gets all shortlists that are owned by the currently authenticated user

POST /shortlists/createList - Requires a JSON body containing a 'listName' value. Upon posting, returns the newly created shortlist

POST /shortlists/addToList - Requires a JSON body containing a 'listId' and 'playerId' (both are objectIds, one of the Shortlist element, and the other of the Player element). Upon posting, returns the updated shortlist with the newly added value.

POST /shortists/removeFromList - Requires a JSON body containing a 'listId' and 'playerId' (both are objectIds, one of the Shortlist element, and the other of the Player element). Upon posting, returns the updated shortlist with the specified player object removed

### Player Routes
GET /players/getAll - Returns all players in the players collection

GET /players/get/:id - Returns a player from the players collection where the :id matches a UniqueId of the player (not objectId)

GET /players/find - Returns players that match the parameters of the query passed in through query params in the URL

GET /players/search - Returns both Players and Teams that contain the value in their name, passed through query params of 'data' in URL (eg. /players/search?data=ter returns all players and teams containing 'ter' in their names)

GET /players/filter - Returns all players that match the queryable filter paramter. This route allows for the use of <= & >= operations (gte and lte) by providing either gte or lte after a double underscore, followed by an equals and the value to compare (example __gte=15). This uses a double underscore as some field names contain a single underscore to seperate words. If I want to query the database for all players with an Age between 19 and 21, I can use the parameters:

```
?Age__lte=21&Age__gte=19
```
This route allows for multiple query parameters using gte, lte, or =

### Transfer Routes
GET /transfers/getAll - Returns all transfer data in the transferdata collection

GET /transfers/get/:id - Returns transfers from the transferdata collection where the :id matches a UniqueId of the transferdata (not objectId) (returns multiple objects)

GET /transfers/find - Returns transfers that match the parameters of the query passed in through query params in the URL

### Compatibility Routes
GET /compatibility/getAll - Returns all data in the compatibilityscores collection

GET /compatibility/get/:id - Returns the specified compatibility score data for the specified UniqueId (not objectId)

### Playstyle Routes
GET /playstyles/getAll - Returns all data in the playstyles

GET /playstyles/get/:id - Returns the specified playstyle data for the specified UniqueId (not objectId)

GET /playstyles/find - Returns playstyles that match the parameters of the query passed in through query params in the URL

GET GET /playstyles/get/:id/graph - Returns the specified playstyle data for the specified UniqueId (not objectId) in radar graph data format

### Position Routes
GET /positions/get/:id - id params: uniqueId of the Player (not objectId). Returns a single object where the :id matches in the relevant positional data collection

GET /positions/get/:id/graph - id params: uniqueId of the Player (not objectId). Returns a single object where the :id matches in the relevant positional data collection, and provides output in radar chart format



