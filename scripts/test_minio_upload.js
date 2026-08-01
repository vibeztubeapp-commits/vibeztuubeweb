const { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
  },
  forcePathStyle: true,
});

async function run() {
  const bucketName = "vibeztube-bucket";
  console.log("Checking if bucket exists...");
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log("Bucket already exists!");
  } catch (err) {
    console.log("Bucket does not exist or error:", err.message);
    try {
      console.log("Creating bucket...");
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log("Bucket created successfully!");
    } catch (createErr) {
      console.error("Create bucket failed:", createErr);
    }
  }

  console.log("Testing test file upload...");
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: "test_upload.txt",
      Body: Buffer.from("Hello MinIO from script"),
      ContentType: "text/plain",
    }));
    console.log("Upload test succeeded!");
  } catch (uploadErr) {
    console.error("Upload test failed:", uploadErr);
  }
}

run();
