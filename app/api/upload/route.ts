import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true, // Required for MinIO
})

async function ensureBucketExists(bucketName: string) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }))
      console.log(`Created MinIO bucket: ${bucketName}`)
    } else {
      throw err;
    }
  }

  // Configure public read policy for anonymous image access
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicRead",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  }

  await s3Client.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy),
    })
  )
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileKey = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`

    const bucketName = process.env.MINIO_BUCKET || "vibeztube-bucket"

    // Ensure bucket is initialized
    await ensureBucketExists(bucketName)

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type,
      })
    )

    // Compute external S3/MinIO resource access url path
    const externalDomain = process.env.NEXT_PUBLIC_MINIO_EXTERNAL_URL
    const srcUrl = externalDomain ? `${externalDomain}/${bucketName}/${fileKey}` : `/${bucketName}/${fileKey}`

    return NextResponse.json({
      src: srcUrl,
      type: file.type.startsWith("video") ? "video" : "image",
    })
  } catch (err: any) {
    console.error("MinIO S3 upload error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
