import fs from 'node:fs';

const directory = 'qa-results';
const data = JSON.parse(fs.readFileSync(`${directory}/browser.json`, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('qa/manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));

function addCheck(id, check) {
    const row = data.results.find(result => result.id === id);
    if (!row || row.checks.some(existing => existing.name === check.name)) return;
    row.checks.push(check);
    if (row.checks.some(item => item.result === 'Не пройден')) row.status = 'Не пройден';
}

addCheck('NFR-SWR-4-3-1', {
    name: 'Состав прямых зависимостей',
    result: Object.keys(pkg.dependencies).every(name => ['phaser', 'vite', 'phaser4-rex-plugins'].includes(name)) ? 'Пройден' : 'Не пройден',
    observed: Object.keys(pkg.dependencies).join(', ')
});
addCheck('NFR-SWR-4-2-1', {
    name: 'TypeScript ES6+',
    result: pkg.devDependencies.typescript && /es(202[0-9]|next)/i.test(tsconfig.compilerOptions.target) ? 'Пройден' : 'Не пройден',
    observed: `TypeScript ${pkg.devDependencies.typescript}; target ${tsconfig.compilerOptions.target}; module ${tsconfig.compilerOptions.module}`
});

data.dateMoscow = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'medium'
}).format(new Date(data.date));
data.results.sort((a, b) => a.id.localeCompare(b.id, 'ru', { numeric: true }));
data.counts = {};
for (const row of data.results) {
    row.title = manifest.find(item => item.id === row.id)?.title ?? row.title;
    row.comment = [
        ...row.checks.filter(check => check.result === 'Не пройден')
            .map(check => `${check.name}${check.observed ? `: ${check.observed}` : ''}`),
        row.error ? `Ошибка выполнения: ${row.error}` : '',
        row.limits
    ].filter(Boolean).join('\n');
    data.counts[row.status] = (data.counts[row.status] ?? 0) + 1;
}
data.subchecks = data.results.flatMap(row => row.checks.map(check => ({ requirement: row.id, ...check })));
data.reportGeneratedAt = new Date().toISOString();
fs.writeFileSync(`${directory}/report.json`, JSON.stringify(data, null, 2) + '\n');

const escape = value => String(value ?? '').replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const rows = data.results.map(row => `
    <tr>
        <td>${escape(row.id)}<br>${escape(row.title)}</td>
        <td>${escape(row.status)}</td>
        <td><pre>${escape(row.comment)}</pre>
            <details><summary>Проверки: ${row.checks.length}</summary>
                ${row.checks.map(check => `<p>${escape(check.result)} — ${escape(check.name)}${check.observed ? `: ${escape(check.observed)}` : ''}</p>`).join('\n')}
                ${row.evidence ? `<img src="${escape(row.evidence)}" alt="Сцена во время проверки">` : ''}
            </details>
        </td>
    </tr>`).join('\n');
const html = `<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Результаты проверок Galaxy Runner</title>
    <style>
        body { margin: 24px; font: 16px system-ui, sans-serif; color: #20334a; background: #f5f7fb; }
        p { line-height: 1.6; } table { width: 100%; border-collapse: collapse; background: white; }
        th, td { padding: 12px; border: 1px solid #d7e0e9; text-align: left; vertical-align: top; }
        th { background: #20334a; color: white; } pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
        img { display: block; max-width: 900px; width: 100%; margin-top: 16px; } summary { cursor: pointer; }
    </style>
</head>
<body>
    <h1>Результаты проверок Galaxy Runner</h1>
    <p>Дата прогона: ${escape(data.dateMoscow)}. Версия: ${escape(data.build.version)}. Git: ${escape(data.build.commit.slice(0, 7))}.</p>
    <p><b>${Object.entries(data.counts).map(([status, count]) => `${escape(status)}: ${count}`).join('; ')}.</b>
       Сценариев: ${data.results.length}; отдельных проверок: ${data.subchecks.length}.</p>
    <p>Проверяются реальные сцены, физика и сохранения с подготовленными тестовыми состояниями.
       Результат относится к перечисленным проверкам и не означает полное прохождение игры.
       Скриншоты предназначены для ручного просмотра; автоматическое сравнение изображений не выполняется.</p>
    <p>Адрес: ${escape(data.target)}. Браузер: ${escape(data.browser)}.
       Окно: ${data.viewport.width}×${data.viewport.height}; Canvas: ${data.canvas.width}×${data.canvas.height}.
       SHA-256 исходников: ${escape(data.build.sourceSha256)}.</p>
    <p>Браузерные результаты относятся к сохранённому прогону. Настройки TypeScript и зависимости проверены при создании отчёта.</p>
    <table><thead><tr><th>Сценарий</th><th>Результат</th><th>Подробности</th></tr></thead><tbody>${rows}</tbody></table>
</body>
</html>`;
fs.writeFileSync(`${directory}/requirements.html`, html);
console.log(JSON.stringify({ scenarios: data.results.length, checks: data.subchecks.length, counts: data.counts }, null, 2));
