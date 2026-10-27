async function main() {
  const res = await fetch('http://localhost:3000/contact');
  const html = await res.text();
  const idx = html.indexOf('id="map-section"');
  if (idx !== -1) {
    const after = html.substring(idx + 1500, idx + 4500);
    console.log(after);
  }
}
main();
