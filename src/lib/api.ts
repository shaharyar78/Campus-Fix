export interface ApiError {
  code: string;
  message: string;
  existing_report_id?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        data: null,
        error: json.error || {
          code: `HTTP_${res.status}`,
          message: json.message || 'Something went wrong. Please try again.',
        },
      };
    }

    return { data: (json.data !== undefined ? json.data : json) as T, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unable to connect to the server.',
      },
    };
  }
}
