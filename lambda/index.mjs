import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-south-1" }));
const s3Client = new S3Client({ region: "ap-south-1" });

const TABLE_NAME = "SmartWalletLogs";
const BUCKET_NAME = "smartwallet-receipts-prajjwal";
const ADMIN_EMAILS = ["prajwalsinghvns19@gmail.com", "prajjwal_admin@gmail.com"];

const fallbackAlgorithm = (merchant, amount) => {
    const amt = parseFloat(amount);
    const low = merchant.toLowerCase();
    const lux = ["gucci", "rolex", "porsche", "louis", "ritz"];
    if (lux.some(l => low.includes(l))) return "DECLINED - (Fallback) Luxury restricted.";
    if (amt > 500) return "DECLINED - (Fallback) Auto-limit exceeded.";
    return "APPROVED - (Fallback) Standard expense approved.";
};

const sendDiscordAlert = async (email, merchant, amount, decision, strikeCount) => {
    if (!process.env.DISCORD_WEBHOOK_URL) return;
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            embeds: [{
                title: "🚨 FRAUD ALERT — SmartWallet AI",
                color: 15158332,
                fields: [
                    { name: "👤 Employee", value: email, inline: true },
                    { name: "🏪 Merchant", value: merchant, inline: true },
                    { name: "💰 Amount", value: `$${amount}`, inline: true },
                    { name: "❌ Decision", value: decision, inline: false },
                    { name: "⚠️ Strike Count", value: `${strikeCount} declines — Account flagged for review`, inline: false }
                ],
                footer: { text: "SmartWallet AI Security Engine" },
                timestamp: new Date().toISOString()
            }]
        })
    });
};

export const handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    try {
        const method = event.httpMethod || (event.requestContext?.http?.method || "");

        if (method === "OPTIONS") return { statusCode: 200, headers, body: "OK" };

        if (method === "POST") {
            const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

            // 📸 ACTION 1: GET PRESIGNED URL
            if (body.filename && body.contentType) {
                const uniqueKey = `receipts/${Date.now()}-${body.filename}`;
                const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: uniqueKey, ContentType: body.contentType });
                const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
                return { statusCode: 200, headers, body: JSON.stringify({ uploadUrl, fileKey: uniqueKey }) };
            }

            // 👁️ ACTION 2: ANALYZE RECEIPT WITH GEMINI VISION AI
            if (body.fileKey) {
                const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: body.fileKey });
                const s3Response = await s3Client.send(getCommand);

                const chunks = [];
                for await (const chunk of s3Response.Body) chunks.push(chunk);
                const base64Image = Buffer.concat(chunks).toString("base64");

                const ext = body.fileKey.split('.').pop().toLowerCase();
                const mimeType = ext === "png" ? "image/png" : (ext === "jpg" || ext === "jpeg") ? "image/jpeg" : "image/png";

                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { inline_data: { mime_type: mimeType, data: base64Image } },
                                    { text: `You are a corporate expense auditor analyzing a receipt photo. Rules: 1) If multiple receipts are visible, focus ONLY on the most prominent/front receipt. 2) Extract the MERCHANT NAME from the top of the receipt (store brand name like "DMart" or "Office Depot", not branch address or company legal name like "Avenue Supermarts Ltd"). 3) Extract the FINAL TOTAL AMOUNT actually paid - this is the last/largest total at the bottom (for Indian receipts look for the subtotal before GST breakup table, for US receipts look for TOTAL AMOUNT or AMOUNT DUE). Never pick subtotals, individual item prices, or GST component values. 4) If you cannot confidently read a value, make your best guess from context. Reply ONLY in valid JSON with no markdown, no explanation, nothing else: {"merchant": "string", "amount": number}` }
                                ]
                            }]
                        })
                    }
                );

                const geminiData = await geminiRes.json();

                if (!geminiData.candidates || !geminiData.candidates[0]) {
                    throw new Error("Gemini Vision returned no result");
                }

                let contentText = geminiData.candidates[0].content.parts[0].text.trim();
                contentText = contentText.replace(/```json/g, "").replace(/```/g, "").trim();

                return { statusCode: 200, headers, body: contentText };
            }

            // 💳 ACTION 3: SWIPE CARD
            const merchant = body.merchant || "Unknown";
            const amount = body.amount || 0;
            const email = body.email || "employee@company.com";
            let decision = "";

            const prompt = `Evaluate corporate expense: Merchant: "${merchant}", Amount: $${amount}. Policy: Auto-limit is $500. Decline luxury vendors (Gucci, Rolex, Porsche, Louis Vuitton, Ritz). Otherwise, approve. Reply with exactly 1 word APPROVED or DECLINED, followed by a hyphen and a short 4-word reason.`;

            try {
                const aiResponse = await bedrockClient.send(new InvokeModelCommand({
                    modelId: "us.amazon.nova-micro-v1:0",
                    contentType: "application/json",
                    accept: "application/json",
                    body: JSON.stringify({
                        messages: [{ role: "user", content: [{ text: prompt }] }],
                        inferenceConfig: { temperature: 0.1, maxTokens: 50 }
                    })
                }));
                const parsed = JSON.parse(new TextDecoder().decode(aiResponse.body));
                decision = parsed.output.message.content[0].text.trim();
            } catch (aiError) {
                console.warn("Bedrock Error/Throttled. Fallback:", aiError.message);
                decision = fallbackAlgorithm(merchant, amount);
            }

            const timestamp = Date.now().toString();
            const item = {
                transactionId: `txn_${timestamp}`,
                id: timestamp,
                timestamp: new Date().toISOString(),
                merchant,
                amount,
                email,
                aiDecision: decision
            };

            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

            // 🚨 Discord Alert
            if (decision.startsWith("DECLINED")) {
                try {
                    const scanResult = await docClient.send(new ScanCommand({
                        TableName: TABLE_NAME,
                        FilterExpression: "email = :e AND begins_with(aiDecision, :d)",
                        ExpressionAttributeValues: { ":e": email, ":d": "DECLINED" }
                    }));
                    const strikeCount = (scanResult.Items || []).length;
                    if (strikeCount >= 2) {
                        await sendDiscordAlert(email, merchant, amount, decision, strikeCount);
                    }
                } catch (discordErr) {
                    console.warn("Discord alert failed:", discordErr.message);
                }
            }

            return { statusCode: 200, headers, body: JSON.stringify({ aiDecision: decision }) };
        }

        // 🔒 FETCH LEDGER
        if (method === "GET") {
            const requestEmail = event.queryStringParameters?.email;
            if (!requestEmail) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required." }) };

            let response;
            if (ADMIN_EMAILS.includes(requestEmail)) {
                response = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
            } else {
                response = await docClient.send(new ScanCommand({
                    TableName: TABLE_NAME,
                    FilterExpression: "email = :emailVal",
                    ExpressionAttributeValues: { ":emailVal": requestEmail }
                }));
            }

            let items = response.Items || [];
            items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return { statusCode: 200, headers, body: JSON.stringify(items.slice(0, 100)) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid route" }) };

    } catch (err) {
        console.error("Fatal Lambda Error:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};