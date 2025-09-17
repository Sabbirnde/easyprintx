/**
 * File Auto-Expiry System Test
 * Basic functionality verification
 */

import { FileCleanupService } from '@/services/fileCleanupService';

export const testFileExpiry = () => {
  console.log('🧪 Testing File Auto-Expiry System...');

  // Test expiry calculation
  const now = new Date();
  
  // Test recent file (should not be expired)
  const recentFile = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  const recentExpiry = FileCleanupService.getTimeUntilExpiry(recentFile.toISOString());
  console.log('Recent file expiry:', recentExpiry);
  
  // Test old file (should be expired)
  const oldFile = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
  const oldExpiry = FileCleanupService.getTimeUntilExpiry(oldFile.toISOString());
  console.log('Old file expiry:', oldExpiry);
  
  // Test file expiring soon
  const expiringFile = new Date(now.getTime() - 23 * 60 * 60 * 1000); // 23 hours ago
  const expiringExpiry = FileCleanupService.getTimeUntilExpiry(expiringFile.toISOString());
  console.log('Expiring file:', expiringExpiry);

  // Verify expected results
  const tests = [
    { 
      name: 'Recent file should not be expired', 
      result: !recentExpiry.expired, 
      expected: true 
    },
    { 
      name: 'Old file should be expired', 
      result: oldExpiry.expired, 
      expected: true 
    },
    { 
      name: 'Expiring file should have low hours left', 
      result: expiringExpiry.hoursLeft <= 1, 
      expected: true 
    }
  ];

  console.log('\n📊 Test Results:');
  tests.forEach(test => {
    const status = test.result === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
  });

  const allPassed = tests.every(test => test.result === test.expected);
  console.log(`\n${allPassed ? '🎉' : '🚨'} ${allPassed ? 'All tests passed!' : 'Some tests failed!'}`);
  
  return allPassed;
};

// Export for manual testing
(window as any).testFileExpiry = testFileExpiry;