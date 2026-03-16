import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Forward request to Livepeer Studio API
        const livepeerReq = await fetch('https://livepeer.studio/api/stream', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer 82e90e7d-5971-4566-98cb-75afee769969`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await livepeerReq.json();

        if (!livepeerReq.ok) {
            return NextResponse.json({ error: data }, { status: livepeerReq.status });
        }

        // 2. Return the StreamKey securely to our frontend
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('Livepeer Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
