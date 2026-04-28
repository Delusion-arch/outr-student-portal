const fs = require('fs');

const html = fs.readFileSync('../backend/erp_dump.html', 'utf8');

const results = {};
const regex = /<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/igs;

let match;
while ((match = regex.exec(html)) !== null) {
    let rawKey = match[1].replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/:$/, '').trim();
    // If key has multiple lines (e.g. from an embedded h5), grab only the last actual word part
    let keyLines = rawKey.split(/[\r\n]+/);
    let key = keyLines[keyLines.length - 1].trim();
    
    let value = match[2].replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    if (key) {
        results[key] = value;
    }
}

// Also get Name from the header: <h4 class="card-header bg-light"><i ...></i>PRIYANKAR MALLICK            </h4>
let nameMatch = html.match(/<h4[^>]*class="card-header[^"]*"[^>]*>(?:<i[^>]*><\/i>)?([^<]+)/i);
if (nameMatch) {
    results['FullName'] = nameMatch[1].trim();
}

console.log(results);
