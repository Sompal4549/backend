async function test() {
  const pages = ['/turnkey', '/consultancy', '/products', '/projects-and-clients', '/contact', '/career'];
  for (const p of pages) {
    try {
      const res = await fetch('http://localhost:3000' + p);
      const text = await res.text();
      console.log(`=== Page: ${p} (status: ${res.status}) ===`);
      const matches = [...text.matchAll(/Error:\s*([^\n\\"]+)/g)].map(m => m[1]);
      const typeErrors = [...text.matchAll(/TypeError:\s*([^\n\\"]+)/g)].map(m => m[1]);
      const rscErrors = [...text.matchAll(/\\"message\\":\\"([^\\"]+)\\"/g)].map(m => m[1]);
      console.log("Errors:", [...new Set([...matches, ...typeErrors, ...rscErrors])].slice(0, 5));
    } catch (e) {
      console.log(`Failed fetching ${p}:`, e.message);
    }
  }
}
test();
