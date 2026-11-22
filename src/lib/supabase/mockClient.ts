import type { FilterOp, MockQueryPayload } from './mockStore';

type QueryResult<T = unknown> = {
  data: T;
  error: { message: string; code?: string } | null;
};

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  user: AuthUser;
};

type AuthChangeCallback = (event: string, session: AuthSession | null) => void;

type Executor = (payload: MockQueryPayload) => Promise<QueryResult>;

class MockQueryBuilder implements PromiseLike<QueryResult> {
  private payload: MockQueryPayload;
  private executor: Executor;

  constructor(table: string, executor: Executor) {
    this.executor = executor;
    this.payload = {
      table,
      action: 'select',
      filters: [],
      order: null,
      limit: null,
      single: false,
      maybeSingle: false,
    };
  }

  select(columns = '*'): this {
    if (this.payload.action === 'select') {
      this.payload.columns = columns;
    } else {
      this.payload.columns = columns;
      this.payload.returning = true;
    }
    return this;
  }

  insert(values: unknown): this {
    this.payload.action = 'insert';
    this.payload.values = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.payload.action = 'update';
    this.payload.values = values;
    return this;
  }

  delete(): this {
    this.payload.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.payload.filters = [...(this.payload.filters || []), { type: 'eq', column, value }];
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.payload.filters = [...(this.payload.filters || []), { type: 'in', column, values }];
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.payload.filters = [...(this.payload.filters || []), { type: 'ilike', column, pattern }];
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.payload.filters = [...(this.payload.filters || []), { type: 'is', column, value }];
    return this;
  }

  match(criteria: Record<string, unknown>): this {
    this.payload.filters = [...(this.payload.filters || []), { type: 'match', criteria }];
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.payload.order = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number): this {
    this.payload.limit = count;
    return this;
  }

  single(): Promise<QueryResult> {
    this.payload.single = true;
    return this.executor(this.payload);
  }

  maybeSingle(): Promise<QueryResult> {
    this.payload.maybeSingle = true;
    return this.executor(this.payload);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executor(this.payload).then(onfulfilled, onrejected);
  }
}

export interface MockAuthAdapter {
  getUser: () => Promise<{ data: { user: AuthUser | null }; error: { message: string } | null }>;
  getSession: () => Promise<{ data: { session: AuthSession | null }; error: { message: string } | null }>;
  signInWithPassword: (creds: {
    email: string;
    password: string;
  }) => Promise<{ data: { user: AuthUser | null; session: AuthSession | null }; error: { message: string } | null }>;
  signUp: (params: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string; data?: Record<string, unknown> };
  }) => Promise<{ data: { user: AuthUser | null; session: AuthSession | null }; error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
  updateUser: (attrs: { password?: string }) => Promise<{ data: { user: AuthUser | null }; error: { message: string } | null }>;
  resetPasswordForEmail: (email: string, opts?: { redirectTo?: string }) => Promise<{ data: Record<string, unknown>; error: { message: string } | null }>;
  exchangeCodeForSession: (code: string) => Promise<{ data: { session: AuthSession | null }; error: { message: string } | null }>;
  onAuthStateChange: (cb: AuthChangeCallback) => { data: { subscription: { unsubscribe: () => void } } };
}

export function createMockClientWithAdapter(
  executor: Executor,
  auth: MockAuthAdapter
) {
  return {
    from(table: string) {
      return new MockQueryBuilder(table, executor);
    },
    auth,
    channel() {
      const channelObj = {
        on() {
          return channelObj;
        },
        subscribe() {
          return channelObj;
        },
      };
      return channelObj;
    },
    async removeChannel() {
      return 'ok';
    },
  };
}

export type { FilterOp, MockQueryPayload, AuthUser, AuthSession, AuthChangeCallback };
