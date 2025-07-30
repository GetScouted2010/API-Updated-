const fs = require('fs');
const path = require('path');

// Load the field mapping
const mappingFilePath = path.join(__dirname, '../cs_field_mapping.json');
let fieldMapping;

try {
  fieldMapping = JSON.parse(fs.readFileSync(mappingFilePath, 'utf-8'));
  console.log('Field mapping loaded.');
} catch (error) {
  console.error('Error loading cs_field_mapping.json:', error.message);
  fieldMapping = {}; // fallback to empty object to avoid crashing
}

// Convert from sanitized field name (Mongo-safe) to original (display-safe)
function getOriginalFieldName(sanitizedFieldName) {
  for (const [original, sanitized] of Object.entries(fieldMapping)) {
    if (sanitized === sanitizedFieldName) {
      return original;
    }
  }
  return sanitizedFieldName;
}

// Convert from original (user display) to sanitized (Mongo field-safe)
function getSanitizedFieldName(originalFieldName) {
  return fieldMapping[originalFieldName] || originalFieldName;
}

module.exports = {
  getOriginalFieldName,
  getSanitizedFieldName
};
