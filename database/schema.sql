CREATE TABLE "Users" (
    "Id" UUID PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255) NOT NULL UNIQUE,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "Role" VARCHAR(50) NOT NULL, -- Admin, Business, Customer
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Businesses" (
    "Id" UUID PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "BusinessType" VARCHAR(100) NOT NULL, -- Restaurant, Gym, Salon, Clinic, Coaching, Turf, Other
    "OwnerName" VARCHAR(255) NOT NULL,
    "Phone" VARCHAR(50) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "Address" TEXT NOT NULL,
    "City" VARCHAR(255) NOT NULL,
    "OpeningTime" VARCHAR(50) NOT NULL, -- e.g. "09:00"
    "ClosingTime" VARCHAR(50) NOT NULL, -- e.g. "21:00"
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Offers" (
    "Id" UUID PRIMARY KEY,
    "BusinessId" UUID NOT NULL REFERENCES "Businesses"("Id") ON DELETE CASCADE,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "Category" VARCHAR(100) NOT NULL, -- e.g. "Lunch Hour", "Gym Trial"
    "OriginalPrice" DECIMAL(18,2) NOT NULL,
    "OfferPrice" DECIMAL(18,2) NOT NULL,
    "DiscountPercentage" DECIMAL(5,2) NOT NULL,
    "StartDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "EndDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "TermsAndConditions" TEXT,
    "Status" VARCHAR(50) NOT NULL, -- Draft, Active, Paused, Expired, Cancelled
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CK_Offer_PriceCheck" CHECK ("OfferPrice" < "OriginalPrice")
);
CREATE INDEX "IX_Offers_BusinessId" ON "Offers"("BusinessId");
CREATE INDEX "IX_Offers_Status" ON "Offers"("Status");

CREATE TABLE "OfferSlots" (
    "Id" UUID PRIMARY KEY,
    "OfferId" UUID NOT NULL REFERENCES "Offers"("Id") ON DELETE CASCADE,
    "SlotDate" DATE NOT NULL,
    "StartTime" TIME NOT NULL,
    "EndTime" TIME NOT NULL,
    "Capacity" INT NOT NULL,
    "BookedCount" INT NOT NULL DEFAULT 0,
    "Status" VARCHAR(50) NOT NULL, -- Available, Full, Closed, Expired, Cancelled
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "IX_OfferSlots_OfferId" ON "OfferSlots"("OfferId");
CREATE INDEX "IX_OfferSlots_Status" ON "OfferSlots"("Status");

CREATE TABLE "Bookings" (
    "Id" UUID PRIMARY KEY,
    "BookingReference" VARCHAR(100) NOT NULL UNIQUE,
    "OfferId" UUID NOT NULL REFERENCES "Offers"("Id") ON DELETE CASCADE,
    "SlotId" UUID NOT NULL REFERENCES "OfferSlots"("Id") ON DELETE CASCADE,
    "CustomerName" VARCHAR(255) NOT NULL,
    "CustomerPhone" VARCHAR(50) NOT NULL,
    "CustomerEmail" VARCHAR(255),
    "PeopleCount" INT NOT NULL DEFAULT 1,
    "SpecialNote" TEXT,
    "Status" VARCHAR(50) NOT NULL, -- Pending, Confirmed, Cancelled, Completed, No Show
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "IX_Bookings_OfferId" ON "Bookings"("OfferId");
CREATE INDEX "IX_Bookings_SlotId" ON "Bookings"("SlotId");
CREATE INDEX "IX_Bookings_BookingReference" ON "Bookings"("BookingReference");
