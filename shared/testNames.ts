import { getResponseStatusTitle, RESPONSE_STATUS } from './responseStatus';

export const ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME = 'Array List Without Pagination';
export const LOAD_TEST_NAME = 'Load Test';
export const MEDIAN_RESPONSE_TIME_TEST_NAME = 'Median Response Time';
export const NETWORK_SHARE_TEST_NAME = 'Network Share Calculation';
export const PING_LATENCY_TEST_NAME = 'Ping Latency';
export const RESPONSE_SIZE_CHECK_TEST_NAME = 'Response Size Check';

export const AUTHORIZATION_TEST_NAME = 'Missing Authorization Cookie/Token';
export const CACHE_CONTROL_PRIVATE_API_TEST_NAME = 'Cache-Control for Private API';
export const CLICKJACKING_PROTECTION_TEST_NAME = 'Clickjacking Protection';
export const CORS_TEST_NAME = 'CORS Policy Check';
export const CRUD_TEST_NAME = 'CRUD';
export const HSTS_STRICT_TRANSPORT_SECURITY_TEST_NAME = 'HSTS (Strict-Transport-Security)';
export const INVALID_AUTHORIZATION_TEST_NAME = 'Invalid Authorization Cookie/Token';
export const LARGE_PAYLOAD_TEST_NAME = 'Large Payload Test';
export const MIME_SNIFFING_PROTECTION_TEST_NAME = 'MIME Sniffing Protection';
export const NO_SENSITIVE_SERVER_HEADERS_TEST_NAME = 'No Sensitive Server Headers';
export const NOT_FOUND_TEST_NAME = `${RESPONSE_STATUS.NOT_FOUND} ${getResponseStatusTitle(RESPONSE_STATUS.NOT_FOUND)}`;
export const OPTIONS_METHOD_HANDLING_TEST_NAME = 'OPTIONS Method Handling';
export const REFLECTED_PAYLOAD_SAFETY_TEST_NAME = 'Reflected Payload Safety';
export const UPPERCASE_DOMAIN_TEST_NAME = 'Uppercase Domain Test';
export const UPPERCASE_PATH_TEST_NAME = 'Uppercase Path Test';
export const UNSUPPORTED_METHOD_TEST_NAME = 'Unsupported HTTP Method Handling';
