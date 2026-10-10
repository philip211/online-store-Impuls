import { config } from 'dotenv'

// Runs in every test worker before the app module is imported.
config({ quiet: true })
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.NODE_ENV = 'test'
process.env.PAYMENT_PROVIDER = 'mock'
process.env.SWAGGER_ENABLED = 'false'
// Test uploads stay out of the development folder.
process.env.UPLOADS_DIR = 'uploads-test'
