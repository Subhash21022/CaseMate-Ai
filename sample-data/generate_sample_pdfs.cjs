const fs = require('fs');
const path = require('path');
const PDFDocument = require(path.resolve(__dirname, '../backend/node_modules/pdfkit'));

const sampleDir = __dirname;

function makePdf(textFilename, pdfFilename) {
  const text = fs.readFileSync(path.join(sampleDir, textFilename), 'utf-8');
  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(path.join(sampleDir, pdfFilename));

  doc.pipe(stream);
  doc.fontSize(11).font('Helvetica').text(text, { align: 'left' });
  doc.end();

  return new Promise((resolve) => stream.on('finish', resolve));
}

async function run() {
  await makePdf('1_notice_to_quit.txt', '1_notice_to_quit.pdf');
  await makePdf('2_landlord_letter_conflicting_date.txt', '2_landlord_letter_conflicting_date.pdf');
  await makePdf('3_court_summons_referenced_unuploaded.txt', '3_court_summons_referenced_unuploaded.pdf');
  await makePdf('5_prompt_injection.txt', '5_prompt_injection.pdf');
  console.log('Successfully generated sample PDF documents.');
}

run();
