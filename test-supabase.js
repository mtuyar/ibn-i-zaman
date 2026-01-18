const url = 'https://tuivwlhwwrtboaprxtit.supabase.co/rest/v1/';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aXZ3bGh3d3J0Ym9hcHJ4dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMzg5NTgsImV4cCI6MjA2MjYxNDk1OH0.BMI9h1Wubzsl_LP1sZ4AwWHez-uK5rhVWt6KwRfcBUI';

async function testConnection() {
    console.log('Testing connection to:', url);
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        const text = await response.text();
        console.log('Response:', text.substring(0, 100));
    } catch (error) {
        console.error('Fetch Error:', error.cause || error);
    }
}

testConnection();
