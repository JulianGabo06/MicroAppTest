/**
 * Sube un archivo demo al bucket S3 local (Floci).
 * En un pipeline real, aquí irían catalog.container.js.bundle y profile.container.js.bundle.
 */
const endpoint = process.env.FLOCI_ENDPOINT || 'http://localhost:4566';
const bucket = process.env.S3_BUCKET || 'microapps-bundles';
const key = 'demo/readme.txt';
const body = `MicroApps demo bundle placeholder
Subido: ${new Date().toISOString()}

En producción el host cargaría:
  s3://${bucket}/catalog/ios/mf-manifest.json
  s3://${bucket}/profile/ios/mf-manifest.json
`;

async function main() {
  const url = `${endpoint}/${bucket}/${key}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Upload falló (${res.status})`, text);
    process.exit(1);
  }

  console.log(`✅ Subido: s3://${bucket}/${key}`);
  console.log(`   URL: ${url}`);
  console.log('\nAbre Floci UI (si la levantaste) → Storage → microapps-bundles');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
