async function check() {
  const res = await fetch('http://localhost:3000/contact');
  const html = await res.text();
  const mapIdx = html.indexOf('id="map-section"');
  if (mapIdx === -1) {
    console.log('No map-section found');
    return;
  }
  const footerIdx = html.indexOf('<footer');
  console.log('Between map-section and footer:');
  console.log(html.substring(mapIdx + 20, footerIdx));
}
check();
