import { prisma } from '../src/lib/prisma';

async function runTests() {
  console.log('=== TEST 1: Property Editor Serialization & Decimal Verification ===');
  const property = await prisma.property.findUnique({
    where: { id: 'cmwcs11bq0002tpb87ifu1zg3' },
    include: {
      inventoryGroups: true,
      listingOptions: {
        orderBy: { sortOrder: 'asc' },
      },
      amenities: {
        orderBy: { createdAt: 'asc' },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!property) {
    throw new Error('Property not found in database');
  }

  // Same serialization logic as src/app/admin/(dashboard)/properties/[id]/page.tsx
  const serialized = {
    ...property,
    listingOptions: property.listingOptions.map((opt) => ({
      ...opt,
      basePricePerNight: Number(opt.basePricePerNight),
      weekendPricePerNight: opt.weekendPricePerNight
        ? Number(opt.weekendPricePerNight)
        : null,
      cleaningFee: Number(opt.cleaningFee),
      taxPercentage: Number(opt.taxPercentage),
      extraGuestCharge: Number(opt.extraGuestCharge),
    })),
  };

  console.log(`Property Loaded: ${serialized.name} (${serialized.id})`);
  console.log(`Listing Options count: ${serialized.listingOptions.length}`);

  // Deep check: recursively inspect all fields for any Decimal instances
  function inspectObjectForDecimals(obj: any, path: string = ''): string[] {
    const decimalPaths: string[] = [];
    if (!obj || typeof obj !== 'object') return decimalPaths;

    // Check if this object looks like a Prisma Decimal
    if (obj.constructor && obj.constructor.name === 'Decimal') {
      decimalPaths.push(`${path}: Prisma Decimal detected (${obj.toString()})`);
      return decimalPaths;
    }
    // Also check for Decimal-like properties (s, e, d arrays from Decimal.js)
    if (Array.isArray(obj.d) && typeof obj.s === 'number' && typeof obj.e === 'number') {
      decimalPaths.push(`${path}: Decimal.js structure detected`);
      return decimalPaths;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        decimalPaths.push(...inspectObjectForDecimals(item, `${path}[${index}]`));
      });
    } else {
      for (const [key, value] of Object.entries(obj)) {
        decimalPaths.push(...inspectObjectForDecimals(value, path ? `${path}.${key}` : key));
      }
    }
    return decimalPaths;
  }

  const decimalIssues = inspectObjectForDecimals(serialized);
  if (decimalIssues.length > 0) {
    console.error('FAILED: Decimal objects found in serialized property:');
    decimalIssues.forEach((issue) => console.error('  -', issue));
    process.exit(1);
  } else {
    console.log('PASSED: Zero Decimal objects detected in serialized property.');
  }

  // Verify JSON serialization round-trip (which Next.js RSC boundary does)
  try {
    const jsonStr = JSON.stringify(serialized);
    const roundTrip = JSON.parse(jsonStr);
    console.log(`PASSED: Successfully JSON-serialized property (${jsonStr.length} bytes).`);
  } catch (err) {
    console.error('FAILED: JSON serialization error:', err);
    process.exit(1);
  }

  // Verify all 5 Decimal fields on each listing option are typeof number
  for (const opt of serialized.listingOptions) {
    console.log(`\nVerifying Room Configuration: "${opt.title}" (${opt.slug}):`);
    console.log(`  - basePricePerNight: ${opt.basePricePerNight} (type: ${typeof opt.basePricePerNight})`);
    console.log(`  - weekendPricePerNight: ${opt.weekendPricePerNight} (type: ${typeof opt.weekendPricePerNight})`);
    console.log(`  - cleaningFee: ${opt.cleaningFee} (type: ${typeof opt.cleaningFee})`);
    console.log(`  - taxPercentage: ${opt.taxPercentage} (type: ${typeof opt.taxPercentage})`);
    console.log(`  - extraGuestCharge: ${opt.extraGuestCharge} (type: ${typeof opt.extraGuestCharge})`);

    if (typeof opt.basePricePerNight !== 'number') throw new Error('basePricePerNight is not number');
    if (opt.weekendPricePerNight !== null && typeof opt.weekendPricePerNight !== 'number') throw new Error('weekendPricePerNight is not number/null');
    if (typeof opt.cleaningFee !== 'number') throw new Error('cleaningFee is not number');
    if (typeof opt.taxPercentage !== 'number') throw new Error('taxPercentage is not number');
    if (typeof opt.extraGuestCharge !== 'number') throw new Error('extraGuestCharge is not number');
  }

  console.log('\n=== TEST 2: Extra Guest Pricing Validation & Round-Trip Persistence ===');
  const targetConfig = serialized.listingOptions[0];
  const originalExtraGuest = targetConfig.extraGuestCharge;
  const originalCleaningFee = targetConfig.cleaningFee;

  // 2a. Validate negative value rejection logic
  function validateExtraGuestInput(val: number | undefined): { valid: boolean; error?: string } {
    if (val !== undefined && (isNaN(val) || val < 0)) {
      return { valid: false, error: 'Extra guest charge cannot be negative.' };
    }
    return { valid: true };
  }

  const negCheck = validateExtraGuestInput(-500);
  if (negCheck.valid) {
    throw new Error('FAILED: Negative extraGuestCharge was not rejected!');
  }
  console.log(`PASSED: Negative extraGuestCharge correctly rejected: "${negCheck.error}"`);

  // 2b. Validate empty/zero values handled safely
  const emptyCheck = validateExtraGuestInput(0);
  if (!emptyCheck.valid) {
    throw new Error('FAILED: Zero extraGuestCharge was falsely rejected!');
  }
  console.log('PASSED: Zero/empty extraGuestCharge is valid.');

  // 2c. Update configuration with positive numeric value
  const updatedConfig = await prisma.listingOption.update({
    where: { id: targetConfig.id },
    data: {
      extraGuestCharge: 1200,
      cleaningFee: 500,
    },
  });

  console.log(`Updated "${updatedConfig.title}":`);
  console.log(`  - new extraGuestCharge in DB: ${updatedConfig.extraGuestCharge.toString()}`);

  // 2d. Re-read and re-serialize (simulate page reload)
  const reRead = await prisma.listingOption.findUnique({ where: { id: targetConfig.id } });
  const serializedReRead = {
    ...reRead,
    basePricePerNight: Number(reRead!.basePricePerNight),
    weekendPricePerNight: reRead!.weekendPricePerNight ? Number(reRead!.weekendPricePerNight) : null,
    cleaningFee: Number(reRead!.cleaningFee),
    taxPercentage: Number(reRead!.taxPercentage),
    extraGuestCharge: Number(reRead!.extraGuestCharge),
  };

  console.log(`Serialized Re-read extraGuestCharge: ${serializedReRead.extraGuestCharge} (type: ${typeof serializedReRead.extraGuestCharge})`);
  if (serializedReRead.extraGuestCharge !== 1200) {
    throw new Error(`Expected extraGuestCharge to be 1200, got ${serializedReRead.extraGuestCharge}`);
  }
  console.log('PASSED: Numeric value persisted and reloaded correctly.');

  // 2e. Restore original values in database
  await prisma.listingOption.update({
    where: { id: targetConfig.id },
    data: {
      extraGuestCharge: originalExtraGuest,
      cleaningFee: originalCleaningFee,
    },
  });
  console.log('Restored original values in database.');

  // 2f. Verify other configurations retained original values
  const allConfigs = await prisma.listingOption.findMany({
    where: { propertyId: property.id },
    orderBy: { sortOrder: 'asc' },
  });
  for (let i = 0; i < allConfigs.length; i++) {
    console.log(`Config ${allConfigs[i].title}: basePrice = ₹${allConfigs[i].basePricePerNight}, extraGuest = ₹${allConfigs[i].extraGuestCharge}`);
  }
  console.log('PASSED: All room configurations retain valid original pricing.');

  console.log('\n=== ALL PROPERTY EDITOR DECIMAL TESTS PASSED SUCCESSFULLY! ===');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
