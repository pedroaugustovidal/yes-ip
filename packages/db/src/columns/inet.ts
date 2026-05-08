import { customType } from 'drizzle-orm/pg-core';

export const inet = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'inet';
  },
});
