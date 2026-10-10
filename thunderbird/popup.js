const result = document.getElementById('result');
for (const method of ['start', 'status', 'open']) {
  document.getElementById(method).addEventListener('click', async () => {
    result.textContent = '正在连接…';
    try {
      const response = await browser.runtime.sendNativeMessage('de.zub_systems.notebookaid_t02', { method });
      result.textContent = JSON.stringify(response, null, 2);
    } catch (error) { result.textContent = '连接失败：' + error.message; }
  });
}
