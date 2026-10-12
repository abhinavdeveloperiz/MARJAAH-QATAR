/tmp/gcloud-temp/google-cloud-sdk/bin/gcloud run deploy marjaah-backend --source . --region us-central1 --min-instances 1 --memory 1Gi --cpu 1 --allow-unauthenticated --project marjaah-ab2a6 --set-env-vars="DATABASE_URL=postgresql://postgres:dDFMqmCO9eWtqHIk@db.jjikipdxhgvxpzfpdemr.supabase.co:5432/postgres"

npx firebase-tools@latest deploy --only hosting --project marjaah-ab2a6
