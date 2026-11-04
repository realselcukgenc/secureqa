SQ.addLesson({
  id: "22-ci-cd",
  num: 22,
  icon: "CI",
  minutes: 25,
  title: { tr: "CI/CD & otomasyon", en: "CI/CD & automation" },
  summary: {
    tr: "GitHub Actions ne yapar, test paketi CI'da nasıl koşar, job/step/services ve matrix kavramı — simüle edilmiş bir 'pipeline' fonksiyonuyla.",
    en: "What GitHub Actions does, how the suite runs in CI, the job/step/services and matrix concept — with a simulated 'pipeline' function."
  },
  goals: {
    tr: [
      "CI/CD nedir: her push/PR'da testleri otomatik koşmak, kırılanı erken yakalamak",
      "GitHub Actions sözlüğü: workflow → job → step; <code>services</code> (yan konteyner) ve <code>matrix</code>",
      "Bir job'ın mantığı: adımlar sırayla, zorunlu bir adım kırılırsa job kırmızı; <code>|| true</code> ile beklenen hatayı yut",
      "SecureQA'nın CI'ı: SecureShop (zorunlu) + Juice Shop (bilgi amaçlı, bulgu beklenir)"
    ],
    en: [
      "What CI/CD is: run tests automatically on every push/PR, catch breakage early",
      "The GitHub Actions vocabulary: workflow → job → step; <code>services</code> (sidecar container) and <code>matrix</code>",
      "A job's logic: steps in order, a required step failing turns the job red; swallow an expected failure with <code>|| true</code>",
      "SecureQA's CI: SecureShop (required) + Juice Shop (informational, findings expected)"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Bir güvenlik test paketi ancak <strong>otomatik ve sürekli</strong> koşarsa değerlidir. CI/CD (Continuous Integration / Delivery) tam da budur: her <code>push</code> ve <code>pull_request</code>'te sunucu, test paketini temiz bir makinede baştan koşar. SecureQA'nın <code>.github/workflows/ci.yml</code> dosyası iki işi (job) tanımlar: <strong>SecureShop</strong> (savunma kontrolleri — geçmek zorunda) ve <strong>Juice Shop</strong> (saldırılar — bulgu beklenir, bu yüzden job'ı kırmızıya çekmez).</p>`,
      en: `<p>A security test suite is only valuable if it runs <strong>automatically and continuously</strong>. CI/CD (Continuous Integration / Delivery) is exactly that: on every <code>push</code> and <code>pull_request</code> a server runs the suite from scratch on a clean machine. SecureQA's <code>.github/workflows/ci.yml</code> defines two jobs: <strong>SecureShop</strong> (defensive checks — must pass) and <strong>Juice Shop</strong> (attacks — findings are expected, so they do not turn the job red).</p>` },
    { t: "callout", kind: "info", title: { tr: "Kavramsal + simülasyon", en: "Conceptual + simulation" },
      tr: `<p>CI gerçek bir sunucuda koşar; bu sayfada koşamaz. Mantığı anlamak için <strong>saf Python</strong> ile küçük bir "pipeline" fonksiyonu yazıyoruz: adımları sırayla çalıştırır, zorunlu bir adım kırılırsa durur. Gerçek <code>ci.yml</code>'yi ise salt okunur gösteriyoruz.</p>`,
      en: `<p>CI runs on a real server; it can't run on this page. To understand the logic we write a small "pipeline" function in <strong>pure Python</strong>: it runs steps in order and stops if a required step fails. The real <code>ci.yml</code> is shown read-only.</p>` },
    { t: "h", tr: "Bir job'ın mantığı: adımlar sırayla", en: "A job's logic: steps in order" },
    { t: "text",
      tr: `<p>Bir job, sırayla çalışan <strong>adımlardan</strong> (step) oluşur. Varsayılan olarak bir adım kırılırsa job durur ve kırmızı olur — bu sayede bozuk kodu erken yakalarsın. Bazı adımların başarısızlığı beklenir (Juice Shop saldırıları); onları <code>|| true</code> ile veya <code>continue-on-error</code> ile "yutarsın" ki job yeşil kalsın. Aşağıdaki <code>run_pipeline</code> bu davranışı taklit eder.</p>`,
      en: `<p>A job is a sequence of <strong>steps</strong> that run in order. By default, if a step fails the job stops and turns red — so you catch broken code early. Some steps are expected to fail (Juice Shop attacks); you "swallow" those with <code>|| true</code> or <code>continue-on-error</code> so the job stays green. The <code>run_pipeline</code> below imitates this behaviour.</p>` },
    { t: "code", id: "c1", simulated: true,
      title: { tr: "Mini pipeline çalıştırıcı", en: "Mini pipeline runner" },
      code: String.raw`
def run_pipeline(steps):
    """steps: (name, ok, required) listesi. Sırayla koşar; zorunlu bir adım kırılırsa job kırmızı."""
    results = []
    job_status = "success"
    for name, ok, required in steps:
        if job_status == "failed":
            results.append((name, "skipped"))      # önceki zorunlu adım kırıldı
        elif ok:
            results.append((name, "passed"))
        elif required:
            results.append((name, "failed"))
            job_status = "failed"                   # job'ı kırmızıya çek
        else:
            results.append((name, "ignored"))       # || true : beklenen hata, yut
    return job_status, results


secureshop = [
    ("Install dependencies", True, True),
    ("Functional tests", True, True),
    ("Security checks", True, True),
    ("Upload report", True, True),
]
status, rows = run_pipeline(secureshop)
for name, outcome in rows:
    print(f"{name:22} {outcome}")
print("JOB:", status)

print("\n-- Juice Shop job (bulgu beklenir) --")
juice = [
    ("Install dependencies", True, True),
    ("Attack Juice Shop (|| true)", False, False),   # saldırı 'başarısız' sayılsa da job yeşil
    ("Build comparison report", True, True),
]
print(run_pipeline(juice)[0])
` },
    { t: "callout", kind: "sec",
      tr: `<p>Burada çok önemli bir <strong>anlam farkı</strong> var (11. dersteki iki hedef kuralı): SecureShop job'ında bir güvenlik testinin kırılması <strong>gerçek bir regresyon</strong>dur — biri bir savunmayı bozmuştur, job kırmızı olmalı. Juice Shop job'ında ise saldırının başarılı olması <strong>beklenir</strong> (bulgu üretir); bu yüzden <code>python -m pytest -m juiceshop --no-server || true</code> ile çalıştırılır ve sonuç rapora yazılır, job'ı düşürmez.</p>`,
      en: `<p>There is a crucial <strong>semantic difference</strong> here (the two-targets rule from lesson 11): in the SecureShop job a security test failing is a <strong>real regression</strong> — someone broke a defense, the job must go red. In the Juice Shop job the attack succeeding is <strong>expected</strong> (it produces findings); so it runs with <code>python -m pytest -m juiceshop --no-server || true</code> and the result is written to the report without failing the job.</p>` },
    { t: "h", tr: "services ve matrix", en: "services and matrix" },
    { t: "text",
      tr: `<p><strong>services</strong>: bir job'ın yanında geçici bir yardımcı konteyner başlatır. SecureQA'nın Juice Shop job'ı, <code>bkimminich/juice-shop:v20.3.0</code> imajını 3000 portunda bir <code>service</code> olarak koşar ve testler ona saldırır. <strong>matrix</strong>: aynı job'ı birden çok kombinasyonda (örn. Python sürümleri, işletim sistemleri) çoğaltır; her kombinasyon ayrı bir job olur ve adımlar <code>\${{ matrix.python-version }}</code> gibi değerlere erişir. Aşağıdaki hücre bir matrisi iş kombinasyonlarına açar.</p>`,
      en: `<p><strong>services</strong>: starts a temporary helper container alongside a job. SecureQA's Juice Shop job runs the <code>bkimminich/juice-shop:v20.3.0</code> image as a <code>service</code> on port 3000 and the tests attack it. <strong>matrix</strong>: multiplies the same job across combinations (e.g. Python versions, operating systems); each combination becomes its own job and steps can read values like <code>\${{ matrix.python-version }}</code>. The cell below expands a matrix into job combinations.</p>` },
    { t: "code", id: "c2", simulated: true,
      title: { tr: "matrix'i iş kombinasyonlarına açmak", en: "Expanding a matrix into jobs" },
      code: String.raw`
from itertools import product


def expand_matrix(matrix):
    """{'python': [...], 'os': [...]} -> her kombinasyon için bir sözlük."""
    keys = list(matrix)
    jobs = []
    for values in product(*[matrix[k] for k in keys]):
        jobs.append(dict(zip(keys, values)))
    return jobs


matrix = {
    "python-version": ["3.12", "3.13"],
    "os": ["ubuntu-24.04", "ubuntu-22.04"],
}
jobs = expand_matrix(matrix)
print("toplam job / total jobs:", len(jobs))
for job in jobs:
    print(f"  python={job['python-version']}  os={job['os']}")
` },
    { t: "project", file: ".github/workflows/ci.yml (kısaltılmış / shortened)",
      tr: `<p>Gerçek <code>ci.yml</code>. <code>on:</code> workflow'u <code>main</code> dalına push/PR'da tetikler. <code>secureshop</code> job'ı bağımlılıkları kurar, Chromium'u indirir ve <strong>functional + security</strong> testlerini koşar (geçmek zorunda). <code>juiceshop</code> job'ı ise Juice Shop'u bir <code>service</code> olarak başlatır, hazır olmasını bekler ve saldırıları <code>|| true</code> ile koşar (bulgu beklenir). Her iki job da raporu <code>upload-artifact</code> ile <code>if: always()</code> olarak yükler — testler kırılsa bile rapor elde kalır. Yerelde aynı akışı <code>python run.py all</code> çalıştırır.</p>`,
      en: `<p>The real <code>ci.yml</code>. <code>on:</code> triggers the workflow on push/PR to <code>main</code>. The <code>secureshop</code> job installs dependencies, downloads Chromium and runs the <strong>functional + security</strong> tests (must pass). The <code>juiceshop</code> job starts Juice Shop as a <code>service</code>, waits for it to be ready, and runs the attacks with <code>|| true</code> (findings expected). Both jobs upload the report with <code>upload-artifact</code> as <code>if: always()</code> — so the report survives even if tests fail. Locally the same flow is <code>python run.py all</code>.</p>`,
      code: String.raw`
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  secureshop:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with:
          python-version: "3.13"
      - name: Install Playwright Chromium
        run: playwright install --with-deps chromium
      - name: Functional tests (must pass)
        run: python -m pytest -m functional
      - name: Defensive security regression checks (must pass)
        run: python -m pytest -m security

  juiceshop:
    runs-on: ubuntu-24.04
    services:
      juiceshop:
        image: bkimminich/juice-shop:v20.3.0
        ports:
          - 3000:3000
    env:
      JUICE_SHOP_URL: http://127.0.0.1:3000
    steps:
      - name: Attack Juice Shop (findings expected — informational)
        run: python -m pytest -m juiceshop --no-server || true
      - name: Upload Juice Shop report
        if: always()
        uses: actions/upload-artifact@v5
`,
      notes: [
        { line: 1, tr: "<code>on:</code> tetikleyiciler — her push ve PR workflow'u başlatır.", en: "<code>on:</code> triggers — every push and PR starts the workflow." },
        { line: 9, tr: "<code>runs-on</code>: job temiz bir Ubuntu makinesinde koşar.", en: "<code>runs-on</code>: the job runs on a clean Ubuntu machine." },
        { line: 18, tr: "Zorunlu adımlar: functional ve security kırılırsa job kırmızı olur (regresyon).", en: "Required steps: if functional or security fail, the job goes red (regression)." },
        { line: 25, tr: "<code>services</code>: Juice Shop bir yan konteyner olarak 3000 portunda başlar.", en: "<code>services</code>: Juice Shop starts as a sidecar container on port 3000." },
        { line: 33, tr: "<code>|| true</code>: saldırı başarılı olsa da olmasa da job düşmez; bulgular rapora gider.", en: "<code>|| true</code>: whether the attack succeeds or not, the job stays up; findings go to the report." },
        { line: 35, tr: "<code>if: always()</code>: önceki adım kırılsa bile rapor artifact olarak yüklenir.", en: "<code>if: always()</code>: the report is uploaded as an artifact even if a prior step failed." }
      ] }
  ],
  exercises: [
    { id: "22-e1",
      title: { tr: "Pipeline çalıştırıcı", en: "Pipeline runner" },
      prompt: {
        tr: `<p><code>run_pipeline(steps) -&gt; (status, results)</code> yaz. <code>steps</code>, <code>(name, ok, required)</code> üçlülerinden oluşur. Adımları sırayla işle:</p><ul><li>Daha önce <strong>zorunlu</strong> bir adım kırıldıysa (job "failed") kalan her adım <code>"skipped"</code></li><li><code>ok</code> ise <code>"passed"</code></li><li><code>ok</code> değil ve <code>required</code> ise <code>"failed"</code> ve job durumu <code>"failed"</code> olur</li><li><code>ok</code> değil ve <code>required</code> değilse <code>"ignored"</code> (<code>|| true</code>) — job etkilenmez</li></ul><p><code>results</code>, <code>(name, outcome)</code> listesidir. Başta job <code>"success"</code>.</p>`,
        en: `<p>Write <code>run_pipeline(steps) -&gt; (status, results)</code>. <code>steps</code> is a list of <code>(name, ok, required)</code> triples. Process steps in order:</p><ul><li>If a <strong>required</strong> step already failed (job "failed"), every remaining step is <code>"skipped"</code></li><li>If <code>ok</code> → <code>"passed"</code></li><li>If not <code>ok</code> and <code>required</code> → <code>"failed"</code> and the job status becomes <code>"failed"</code></li><li>If not <code>ok</code> and not <code>required</code> → <code>"ignored"</code> (<code>|| true</code>) — the job is unaffected</li></ul><p><code>results</code> is a list of <code>(name, outcome)</code>. The job starts as <code>"success"</code>.</p>`
      },
      starter: String.raw`
def run_pipeline(steps):
    results = []
    job_status = "success"
    # ...
    return job_status, results


print(run_pipeline([("a", True, True), ("b", False, False), ("c", True, True)]))
`,
      solution: String.raw`
def run_pipeline(steps):
    results = []
    job_status = "success"
    for name, ok, required in steps:
        if job_status == "failed":
            results.append((name, "skipped"))
        elif ok:
            results.append((name, "passed"))
        elif required:
            results.append((name, "failed"))
            job_status = "failed"
        else:
            results.append((name, "ignored"))
    return job_status, results


print(run_pipeline([("a", True, True), ("b", False, False), ("c", True, True)]))
`,
      check: String.raw`
_s, _r = run_pipeline([("a", True, True), ("b", True, True)])
assert _s == "success" and _r == [("a", "passed"), ("b", "passed")], _t("Hepsi geçerse job success ve tümü passed.", "If all pass, job is success and all passed.")
_s2, _r2 = run_pipeline([("a", True, True), ("b", False, True), ("c", True, True)])
assert _s2 == "failed", _t("Zorunlu bir adım kırılırsa job failed olmalı.", "If a required step fails, job must be failed.")
assert _r2 == [("a", "passed"), ("b", "failed"), ("c", "skipped")], _t(f"b failed, c skipped olmalı; gelen {_r2}.", f"b must be failed and c skipped; got {_r2}.")
_s3, _r3 = run_pipeline([("a", True, True), ("juice", False, False), ("c", True, True)])
assert _s3 == "success", _t("Zorunlu olmayan (|| true) bir adımın kırılması job'ı düşürmemeli.", "A non-required (|| true) step failing must not fail the job.")
assert _r3 == [("a", "passed"), ("juice", "ignored"), ("c", "passed")], _t(f"juice ignored, c passed olmalı; gelen {_r3}.", f"juice must be ignored and c passed; got {_r3}.")
`,
      hints: [
        { tr: "Döngüde önce <code>if job_status == \"failed\": results.append((name, \"skipped\"))</code>.", en: "In the loop first <code>if job_status == \"failed\": results.append((name, \"skipped\"))</code>." },
        { tr: "Sonra <code>ok</code> / zorunlu-kırık / zorunlu-değil dallarını yaz; kırık zorunluda <code>job_status = \"failed\"</code>.", en: "Then the <code>ok</code> / required-fail / non-required branches; on a required fail set <code>job_status = \"failed\"</code>." }
      ] },
    { id: "22-e2",
      title: { tr: "matrix açılımı", en: "Matrix expansion" },
      setup: String.raw`
from itertools import product
`,
      prompt: {
        tr: `<p><code>expand_matrix(matrix) -&gt; list[dict]</code> yaz. <code>matrix</code>, anahtar → değer listesi sözlüğüdür. Tüm kombinasyonları üret; her kombinasyon bir sözlük olsun (anahtarlar aynı, değerler o kombinasyona ait). İpucu: <code>itertools.product</code>.</p>`,
        en: `<p>Write <code>expand_matrix(matrix) -&gt; list[dict]</code>. <code>matrix</code> is a dict of key → list of values. Produce every combination; each combination is a dict (same keys, the values of that combination). Hint: <code>itertools.product</code>.</p>`
      },
      starter: String.raw`
def expand_matrix(matrix):
    ...


print(expand_matrix({"python-version": ["3.12", "3.13"], "os": ["ubuntu-24.04"]}))
`,
      solution: String.raw`
def expand_matrix(matrix):
    keys = list(matrix)
    jobs = []
    for values in product(*[matrix[k] for k in keys]):
        jobs.append(dict(zip(keys, values)))
    return jobs


print(expand_matrix({"python-version": ["3.12", "3.13"], "os": ["ubuntu-24.04"]}))
`,
      check: String.raw`
_m = {"python-version": ["3.12", "3.13"], "os": ["ubuntu-24.04", "ubuntu-22.04"]}
_jobs = expand_matrix(_m)
assert isinstance(_jobs, list) and len(_jobs) == 4, _t(f"2x2 matris 4 job üretmeli; gelen {len(_jobs)}.", f"A 2x2 matrix must produce 4 jobs; got {len(_jobs)}.")
assert all(set(j) == {"python-version", "os"} for j in _jobs), _t("Her job hem python-version hem os anahtarını taşımalı.", "Each job must carry both python-version and os keys.")
_combos = {(j["python-version"], j["os"]) for j in _jobs}
assert _combos == {("3.12", "ubuntu-24.04"), ("3.12", "ubuntu-22.04"), ("3.13", "ubuntu-24.04"), ("3.13", "ubuntu-22.04")}, _t(f"Tüm kombinasyonlar üretilmeli; gelen {_combos}.", f"All combinations must be produced; got {_combos}.")
assert len(expand_matrix({"python-version": ["3.13"]})) == 1, _t("Tek değerli tek anahtar 1 job vermeli.", "A single key with one value must give 1 job.")
`,
      hints: [
        { tr: "<code>keys = list(matrix)</code>, sonra <code>product(*[matrix[k] for k in keys])</code>.", en: "<code>keys = list(matrix)</code>, then <code>product(*[matrix[k] for k in keys])</code>." },
        { tr: "Her kombinasyonu sözlüğe çevir: <code>dict(zip(keys, values))</code>.", en: "Turn each combination into a dict: <code>dict(zip(keys, values))</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "SecureQA CI'ında Juice Shop saldırıları neden <code>|| true</code> ile koşar?", en: "Why do the Juice Shop attacks run with <code>|| true</code> in SecureQA's CI?" },
      options: [{ tr: "Testleri hızlandırmak için", en: "To speed up the tests" }, { tr: "Bulgular beklenir; saldırının başarısı job'ı kırmızıya çekmemeli (sonuç rapora yazılır)", en: "Findings are expected; the attack succeeding must not turn the job red (the result goes to the report)" }, { tr: "Juice Shop testleri gereksiz olduğu için", en: "Because Juice Shop tests are unnecessary" }],
      answer: 1, explain: { tr: "SecureShop'ta ise bir güvenlik testi kırılırsa bu gerçek bir regresyondur ve job kırmızı olmalıdır.", en: "In SecureShop a security test failing is a real regression and the job must go red." } },
    { q: { tr: "GitHub Actions'ta <code>services</code> ne sağlar?", en: "What does <code>services</code> provide in GitHub Actions?" },
      options: [{ tr: "Job'ın yanında geçici bir yardımcı konteyner (örn. Juice Shop, veritabanı)", en: "A temporary helper container alongside the job (e.g. Juice Shop, a database)" }, { tr: "Daha fazla CPU", en: "More CPU" }, { tr: "Otomatik dağıtım", en: "Automatic deployment" }],
      answer: 0, explain: { tr: "SecureQA Juice Shop'u 3000 portunda bir service olarak başlatıp ona saldırır.", en: "SecureQA starts Juice Shop as a service on port 3000 and attacks it." } },
    { q: { tr: "Bir <code>matrix</code> <code>{python: [3.12, 3.13], os: [a, b]}</code> kaç job üretir?", en: "How many jobs does a <code>matrix</code> of <code>{python: [3.12, 3.13], os: [a, b]}</code> produce?" },
      options: [{ tr: "2", en: "2" }, { tr: "4 (her kombinasyon)", en: "4 (every combination)" }, { tr: "1", en: "1" }],
      answer: 1, explain: { tr: "matrix tüm kombinasyonları çoğaltır: 2 × 2 = 4 ayrı job.", en: "A matrix multiplies all combinations: 2 × 2 = 4 separate jobs." } }
  ]
});
