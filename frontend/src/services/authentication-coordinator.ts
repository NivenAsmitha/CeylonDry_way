export class AuthenticationSupersededError extends Error {
  constructor() {
    super("Authentication operation was superseded");
    this.name = "AuthenticationSupersededError";
  }
}

export class AuthenticationCoordinator {
  private accessToken: string | null = null;
  private generation = 0;
  private logoutInProgress = false;
  private refreshController: AbortController | null = null;
  private failureNotifiedGeneration: number | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getGeneration(): number {
    return this.generation;
  }

  isLogoutInProgress(): boolean {
    return this.logoutInProgress;
  }

  isCurrent(generation: number): boolean {
    return !this.logoutInProgress && generation === this.generation;
  }

  commitAccessToken(token: string, generation: number): boolean {
    if (!this.isCurrent(generation)) return false;
    this.accessToken = token;
    return true;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  registerRefresh(controller: AbortController, generation: number): boolean {
    if (!this.isCurrent(generation)) return false;
    this.refreshController = controller;
    return true;
  }

  clearRefresh(controller: AbortController): void {
    if (this.refreshController === controller) {
      this.refreshController = null;
    }
  }

  beginLogout(): number {
    this.logoutInProgress = true;
    this.generation += 1;
    this.failureNotifiedGeneration = null;
    this.accessToken = null;
    this.refreshController?.abort();
    this.refreshController = null;
    return this.generation;
  }

  finishLogout(generation: number): void {
    if (generation !== this.generation) return;
    this.accessToken = null;
    this.logoutInProgress = false;
  }

  markAuthenticationFailure(generation: number): boolean {
    if (!this.isCurrent(generation)) return false;
    this.accessToken = null;
    if (this.failureNotifiedGeneration === generation) return false;
    this.failureNotifiedGeneration = generation;
    return true;
  }
}

export const authenticationCoordinator = new AuthenticationCoordinator();
