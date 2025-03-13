export async function GET() {
  return new Response(
    JSON.stringify({ status: 'API routes are working' }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function POST() {
  return new Response(
    JSON.stringify({ status: 'POST request received' }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
} 