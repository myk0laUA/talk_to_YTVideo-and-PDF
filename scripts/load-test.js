import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// No arbitrary TARGET_URL: this script cannot be pointed at a shared service.
const origin = 'http://127.0.0.1:3149';
const fixtures = JSON.parse(open(__ENV.BENCH_FIXTURES));
const mode = __ENV.WORKLOAD || 'read';
const timeoutRate = new Rate('request_timeouts');
export const options = {
  scenarios: { workload: __ENV.RATE ? { executor: 'constant-arrival-rate', rate: Number(__ENV.RATE), timeUnit: '1s', preAllocatedVUs: 50, maxVUs: 50, duration: __ENV.DURATION || '15s', gracefulStop: '10s' } : { executor: 'constant-vus', vus: Number(__ENV.VUS || 1),
    duration: __ENV.DURATION || '10s', gracefulStop: '10s' } }, maxRedirects: 0,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
  thresholds: { ...(__ENV.RATE ? { dropped_iterations: ['count==0'] } : {}), http_req_failed: ['rate<0.01'], checks: ['rate>0.99'], request_timeouts: ['rate==0'],
    http_req_duration: [mode === 'read' ? 'p(95)<250' : 'p(95)<2000'] },
};
export default function workload() {
  const f = fixtures[(__VU - 1) % fixtures.length];
  const params = { headers: { Cookie: f.cookie, Origin: origin, 'Content-Type': 'application/json' }, timeout: '10s',
    tags: { name: mode === 'read' ? 'GET /api/sources/:id' : 'POST /api/voice-preparations' } };
  if (mode === 'read') {
    const response = http.get(`${origin}/api/sources/${f.id}`, params);
    timeoutRate.add([1050, 1211].includes(response.error_code));
    check(response, { '200 and full source': r => r.status === 200 && r.json('source.characterCount') === f.characters });
  } else {
    const requestId = `00000000-0000-4000-8000-${String(__ITER * 100 + __VU).padStart(12, '0')}`;
    const body = { sourceId: f.id, requestId };
    const response = http.post(`${origin}/api/voice-preparations`, JSON.stringify(body), params);
    timeoutRate.add([1050, 1211].includes(response.error_code));
    check(response, { '201 and prepared source': r => r.status === 201 && r.json('input.variant.source.id') === f.id });
    if (response.status === 201) {
      const cancel = http.post(`${origin}/api/voice-preparations/cancel`, JSON.stringify(body),
        { ...params, tags: { name: 'POST /api/voice-preparations/cancel' } });
      timeoutRate.add([1050, 1211].includes(cancel.error_code));
      check(cancel, { 'cancel released ticket': r => r.status === 200 });
    }
    sleep(0.5); // Honor existing admission budgets; never mint provider credentials in load tests.
  }
}
