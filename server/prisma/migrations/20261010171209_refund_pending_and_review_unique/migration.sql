-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId", "productId");

