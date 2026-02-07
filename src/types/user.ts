export type AccountType = 'personal' | 'company';

export interface UserMetadata {
  account_type?: AccountType;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}
