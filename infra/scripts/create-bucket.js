/**
 * Crea el bucket S3 local en Floci donde subirás los bundles de las mini apps.
 *
 * Requiere: docker compose up -d (Floci en :4566)
 */
const endpoint = process.env.FLOCI_ENDPOINT || 'http://localhost:4566';
const bucket = process.env.S3_BUCKET || 'microapps-bundles';
const region = 'us-east-1';

async function main() {
  const url = `${endpoint}/${bucket}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
      Authorization: 'AWS4-HMAC-SHA256 Credential=test/20200101/us-east-1/s3/aws4_request',
    },
  });

  // Floci / LocalStack-style: 200 o 409 (ya existe) están ok
  if (res.ok || res.status === 409 || res.status === 200) {
    console.log(`✅ Bucket listo: s3://${bucket}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Region:   ${region}`);
    console.log(`   Creds:    AWS_ACCESS_KEY_ID=test / AWS_SECRET_ACCESS_KEY=test`);
    return;
  }

  const body = await res.text();
  console.error(`❌ No se pudo crear el bucket (${res.status})`);
  console.error(body);
  console.error('\n¿Está Floci corriendo? → docker compose up -d');
  process.exit(1);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  console.error('¿Está Floci corriendo? → docker compose up -d');
  process.exit(1);
});
