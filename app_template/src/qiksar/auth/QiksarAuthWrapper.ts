export default interface QiksarAuthWrapper {
  Init(): Promise<void>;
  GetAuthToken(): string;
  Login(route: string): void;
  Logout(): void;
  IsAuthenticated(): boolean;
  HasRealmRole(role: string): boolean;
  GetUserRoles(): string[];
}
