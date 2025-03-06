document.addEventListener('DOMContentLoaded', function() {
  // Элементы секций
  const loginSection = document.getElementById('loginSection');
  const mainSection = document.getElementById('mainSection');
  const settingsSection = document.getElementById('settingsSection');

  // Элементы интерфейса
  const signOutBtn = document.getElementById('signOutBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const creditInfo = document.getElementById('creditInfo');
  const projectList = document.getElementById('projectList');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  const showNewProjectBtn = document.getElementById('showNewProjectBtn');
  const newProjectForm = document.getElementById('newProjectForm');
  const newProjectInput = document.getElementById('newProjectInput');
  const confirmNewProjectBtn = document.getElementById('confirmNewProjectBtn');
  const cancelNewProjectBtn = document.getElementById('cancelNewProjectBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const celeryProgressContainer = document.getElementById('celeryProgressContainer');
  const celeryProgressBar = document.getElementById('celeryProgressBar');
  const celeryProgressText = document.getElementById('celeryProgressText');

  // Кнопка для OAuth входа (должна быть добавлена в index.html)
  const oauthSignInBtn = document.getElementById('oauthSignInBtn');

  let celeryIntervalId = null;

  // Функции работы с localStorage
  function storageGet(key) {
    const value = localStorage.getItem(key);
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  function storageSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Функции переключения экранов
  function showLoginScreen() {
    loginSection.style.display = 'block';
    mainSection.style.display = 'none';
    settingsSection.style.display = 'none';
  }
  function showMainScreen() {
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';
    settingsSection.style.display = 'none';
  }
  function showSettingsScreen() {
    loginSection.style.display = 'none';
    mainSection.style.display = 'none';
    settingsSection.style.display = 'block';
  }

  // PKCE: генерация случайной строки (code_verifier)
  function generateRandomString(length) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
  }

  // PKCE: генерация code_challenge по алгоритму SHA-256 с преобразованием в URL-safe base64
  async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return base64Digest;
  }

  // OAuth: обработка входа по нажатию кнопки
  if (oauthSignInBtn) {
    oauthSignInBtn.addEventListener('click', async () => {
      // Генерируем PKCE-параметры
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      // Сохраняем codeVerifier для последующего обмена
      localStorage.setItem('codeVerifier', codeVerifier);

      // Укажите ваш redirect_uri, зарегистрированный в Google Console
      const redirectUri = 'https://gregmos.github.io/';

      const params = new URLSearchParams({
        client_id: '996490842675-mb6q3m8soslr6i5jr52t6p2f1oaur4et.apps.googleusercontent.com',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      // Перенаправляем пользователя на страницу авторизации Google
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    });
  }

  // Обработка возврата с параметром code (редирект после авторизации)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    const codeVerifier = localStorage.getItem('codeVerifier');
    // Обменяем код на токены через серверный endpoint
    fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/exchange_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, code_verifier: codeVerifier })
    })
    .then(response => response.json())
    .then(data => {
      // Ожидаем, что сервер вернёт access_token, refresh_token и id_token (если нужно)
      if (data.access_token) {
        // Сохраняем access_token для работы с Google API
        localStorage.setItem('authToken', data.access_token);
        // Сохраняем refresh_token, если он пришёл
        if (data.refresh_token) {
          localStorage.setItem('refreshToken', data.refresh_token);
        }
        showMainScreen();
        loadUserCredits();
        loadProjects();
        // Очистка query-параметров из URL
        window.history.replaceState({}, document.title, "/");
      } else {
        console.error("Не получен access_token:", data);
      }
    })
    .catch(err => {
      console.error('Ошибка обмена токена:', err);
    });
  }

  // Если токен уже сохранён, сразу показываем основной экран
  const token = storageGet('authToken');
  if (token) {
    showMainScreen();
    loadUserCredits();
    loadProjects();
  } else {
    showLoginScreen();
  }

  // Выход из системы
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      showLoginScreen();
    });
  } else {
    console.error("Элемент signOutBtn не найден");
  }

  // Настройки
  settingsBtn.addEventListener('click', () => {
    showSettingsScreen();
    const fields = storageGet('selectedFields') || [
      "Название суда",
      "Номер дела",
      "Дата решения",
      "Истец",
      "Ответчик",
      "Фабула дела",
      "Правовое обоснование принятия решения",
      "Краткие выводы резолютивной части",
      "Ссылки на нормы права",
      "Ссылки на судебную практику"
    ];
    document.querySelectorAll('#settingsSection input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = fields.includes(checkbox.value);
    });
  });

  saveSettingsBtn.addEventListener('click', () => {
    const selectedFields = [];
    document.querySelectorAll('#settingsSection input[type="checkbox"]').forEach((checkbox) => {
      if (checkbox.checked) {
        selectedFields.push(checkbox.value);
      }
    });
    storageSet('selectedFields', selectedFields);
    showMainScreen();
  });

  cancelSettingsBtn.addEventListener('click', () => {
    showMainScreen();
  });

  // Функция для получения информации о кредитах
    function loadUserCredits() {
      const token = storageGet('authToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!token) {
        creditInfo.innerText = 'Ошибка авторизации';
        return;
      }
      fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/get_user_info', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'X-Refresh-Token': refreshToken
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.credits !== undefined) {
          creditInfo.innerText = "Осталось кредитов: " + data.credits;
          // Если сервер вернул новый access token, обновляем localStorage:
          if (data.access_token) {
            localStorage.setItem('authToken', data.access_token);
          }
        } else {
          creditInfo.innerText = "Ошибка получения данных";
        }
      })
      .catch(err => {
        console.error(err);
        creditInfo.innerText = "Ошибка получения данных";
      });
    }


  // Функция для загрузки проектов
    function loadProjects() {
      const token = storageGet('authToken');
      if (!token) {
        projectList.innerHTML = 'Ошибка авторизации';
        return;
      }
      fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/get_projects', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(response => response.json())
      .then(data => {
        projectList.innerHTML = '';

        // Получаем ссылку на контейнер загрузки файлов
        const uploadContainer = document.getElementById('uploadContainer');

        if (data.projects) {
          if (data.projects.length === 0) {
            // Нет проектов
            document.getElementById('noProjectsMessage').style.display = 'block';
            // Скрываем блок загрузки
            uploadContainer.style.display = 'none';
          } else {
            // Есть проекты
            document.getElementById('noProjectsMessage').style.display = 'none';
            // Показываем блок загрузки
            uploadContainer.style.display = 'block';

            data.projects.forEach((project) => {
              const li = document.createElement('li');
              li.dataset.projectId = project.id;

              // Название проекта и кол-во файлов
              const nameSpan = document.createElement('span');
              nameSpan.textContent = `${project.name} (${project.processed} ${pluralFile(project.processed)})`;
              li.appendChild(nameSpan);

              // Иконки Google Drive + корзина
              const iconsContainer = document.createElement('div');
              if (project.folder_id) {
                const driveLink = document.createElement('a');
                driveLink.href = "https://drive.google.com/drive/folders/" + project.folder_id;
                driveLink.target = "_blank";
                driveLink.title = "Открыть папку в Google Drive";

                const driveIcon = document.createElement('img');
                driveIcon.src = "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png";
                driveIcon.style.width = "24px";
                driveIcon.style.height = "24px";
                driveIcon.classList.add('drive-icon');

                driveLink.appendChild(driveIcon);
                iconsContainer.appendChild(driveLink);
              }

              const deleteBtn = document.createElement('button');
              deleteBtn.innerHTML = '🗑️';
              deleteBtn.classList.add('icon-button');
              deleteBtn.title = 'Удалить проект';
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm("Вы точно хотите удалить проект?\nЭто также удалит проект из базы данных на сервере (папка на Google Drive не тронется)")) {
                  const token = storageGet('authToken');
                  fetch(`https://cases-kad-30bc963f9461.herokuapp.com/api/delete_project/${project.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.message === 'Project deleted successfully') {
                      loadProjects();
                    } else {
                      alert("Ошибка при удалении проекта");
                    }
                  })
                  .catch(err => {
                    console.error(err);
                    alert('Ошибка при удалении проекта: ' + err.message);
                  });
                }
              });
              iconsContainer.appendChild(deleteBtn);
              li.appendChild(iconsContainer);

              const defaultProjectId = storageGet('defaultProjectId');
              if (defaultProjectId === project.id) {
                li.classList.add('selected');
              }
              li.addEventListener('click', () => {
                storageSet('defaultProjectId', project.id);
                loadProjects();
              });
              projectList.appendChild(li);
            });
          }
        } else {
          projectList.innerHTML = 'Ошибка получения данных проектов';
        }
      })
      .catch(err => {
        console.error(err);
        projectList.innerHTML = 'Ошибка получения данных проектов';
      });
    }



  // Функция склонения слова "файл"
  function pluralFile(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'файл';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'файла';
    return 'файлов';
  }

  // Функции опроса состояния фоновых задач
  function startCeleryPolling() {
    if (celeryIntervalId) return;
    celeryIntervalId = setInterval(pollAllTasks, 5000);
    pollAllTasks();
  }
  function pollAllTasks() {
    let tasks = storageGet('pendingTasks') || [];
    const TEN_MINUTES = 10 * 60 * 1000;
    const MAX_TIMEOUT = 15 * 60 * 1000;
    const now = Date.now();
    tasks.forEach(task => {
      if (!task.done && (now - task.added) > MAX_TIMEOUT) {
        task.done = true;
        task.error = true;
      }
    });
    tasks = tasks.filter(task => now - task.added < TEN_MINUTES);
    storageSet('pendingTasks', tasks);
    if (tasks.length === 0) {
      celeryProgressContainer.style.display = 'none';
      clearInterval(celeryIntervalId);
      celeryIntervalId = null;
      return;
    }
    let total = tasks.length, successCount = 0, failureCount = 0, requestsDone = 0;
    tasks.forEach((task) => {
      if (task.done) {
        if (task.error) failureCount++;
        else successCount++;
        requestsDone++;
        if (requestsDone === total) updateCeleryProgress(successCount, total, tasks);
      } else {
        const token = storageGet('authToken');
        fetch(`https://cases-kad-30bc963f9461.herokuapp.com/api/task_status/${task.taskId}`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(info => {
          if (info.state === 'SUCCESS' || info.state === 'FAILURE') {
            task.done = true;
            if (info.state === 'FAILURE') {
              task.error = true;
              failureCount++;
            } else {
              successCount++;
            }
          }
          requestsDone++;
          if (requestsDone === total) updateCeleryProgress(successCount, total, tasks);
        })
        .catch(err => {
          console.error('Ошибка опроса', err);
          task.done = true;
          task.error = true;
          failureCount++;
          requestsDone++;
          if (requestsDone === total) updateCeleryProgress(successCount, total, tasks);
        });
      }
    });
  }
    function updateCeleryProgress(doneCount, total, tasks) {
      storageSet('pendingTasks', tasks);
      const percent = Math.round((doneCount / total) * 100);
      celeryProgressBar.value = percent;
      celeryProgressText.textContent = `${doneCount}/${total}`;
      celeryProgressContainer.style.display = 'block';

      if (doneCount === total) {
        celeryProgressBar.value = 100;
        celeryProgressText.textContent = `${total}/${total}`;
        loadUserCredits();
        loadProjects();

        // Разблокируем и сбрасываем инпут
        pdfFileInput.disabled = false;
        uploadFileBtn.disabled = false;
        pdfFileInput.value = '';

        // Сбрасываем текст label для выбора файлов
        const fileLabel = document.querySelector('label[for="pdfFileInput"]');
        if (fileLabel) {
          fileLabel.textContent = 'Выбрать файлы';
        }
        // Скрываем кнопку "Обработать"
        uploadFileBtn.style.display = 'none';

        alert('Все файлы успешно обработаны!');

        setTimeout(() => {
          storageSet('pendingTasks', []);
          celeryProgressContainer.style.display = 'none';
          clearInterval(celeryIntervalId);
          celeryIntervalId = null;
        }, 1500);
      }
    }
  function addPendingTask(taskId) {
    let tasks = storageGet('pendingTasks') || [];
    tasks.push({ taskId: taskId, done: false, added: Date.now() });
    storageSet('pendingTasks', tasks);
    startCeleryPolling();
  }

  // Форма создания проекта
  showNewProjectBtn.addEventListener('click', () => {
    newProjectForm.style.display = 'flex';
    showNewProjectBtn.style.display = 'none';
  });
  function resetProjectButtons() {
    confirmNewProjectBtn.disabled = false;
    cancelNewProjectBtn.disabled = false;
    confirmNewProjectBtn.innerHTML = '✔';
  }
  confirmNewProjectBtn.addEventListener('click', () => {
    const name = newProjectInput.value.trim();
    if (!name) return alert('Введите название проекта');
    confirmNewProjectBtn.disabled = true;
    cancelNewProjectBtn.disabled = true;
    confirmNewProjectBtn.innerHTML = '<div class="spinner"></div>Создаём...';
    const token = storageGet('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/create_project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name: name, refresh_token: refreshToken })
    })
    .then(response => response.json())
    .then(data => {
      if (data.project_id) {
        storageSet('defaultProjectId', data.project_id);
        loadProjects();
        loadUserCredits();
        newProjectForm.style.display = 'none';
        showNewProjectBtn.style.display = 'block';
        newProjectInput.value = '';
        resetProjectButtons();
      } else {
        alert('Ошибка создания проекта');
        resetProjectButtons();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Ошибка при запросе создания проекта');
      resetProjectButtons();
    });
  });
  cancelNewProjectBtn.addEventListener('click', () => {
    newProjectForm.style.display = 'none';
    showNewProjectBtn.style.display = 'block';
    newProjectInput.value = '';
  });

  // Обработка выбора файлов
  pdfFileInput.addEventListener('change', () => {
    const count = pdfFileInput.files.length;
    const fileLabel = document.querySelector('label[for="pdfFileInput"]');
    if (count > 0) {
      fileLabel.textContent = `Загружено ${count} ${pluralFile(count)}`;
      uploadFileBtn.style.display = 'inline-block';
    } else {
      fileLabel.textContent = 'Выбрать файлы';
      uploadFileBtn.style.display = 'none';
    }
  });

  // Загрузка файлов
  uploadFileBtn.addEventListener('click', () => {
    const files = pdfFileInput.files;
    if (!files || files.length === 0) return alert("Выберите файлы для загрузки.");
    pdfFileInput.disabled = true;
    uploadFileBtn.disabled = true;
    const defaultProjectId = storageGet('defaultProjectId');
    if (!defaultProjectId) {
      alert("Сначала выберите или создайте проект.");
      pdfFileInput.disabled = false;
      uploadFileBtn.disabled = false;
      return;
    }
    const selectedFields = storageGet('selectedFields') || [
      "Название суда",
      "Номер дела",
      "Дата решения",
      "Истец",
      "Ответчик",
      "Фабула дела",
      "Правовое обоснование принятия решения",
      "Краткие выводы резолютивной части",
      "Ссылки на нормы права",
      "Ссылки на судебную практику"
    ];
    const totalFiles = files.length;
    function processNext(index) {
      if (index >= totalFiles) {
        alert("Все файлы поставлены в очередь на обработку.");
        loadUserCredits();
        startCeleryPolling();
        return;
      }
      const file = files[index];
      if (file.type !== "application/pdf" &&
          file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        alert(`Файл ${file.name} не поддерживается.`);
        processNext(index + 1);
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileBase64 = e.target.result.split(',')[1];
        const token = storageGet('authToken');
        fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/add_document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            project_id: defaultProjectId,
            file: fileBase64,
            file_name: file.name,
            selected_fields: selectedFields,
            refresh_token: localStorage.getItem('refreshToken')
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.task_ids && Array.isArray(data.task_ids)) {
            data.task_ids.forEach(taskId => addPendingTask(taskId));
          } else if (data.task_id) {
            addPendingTask(data.task_id);
          }
          processNext(index + 1);
        })
        .catch(err => {
          console.error(err);
          alert('Ошибка при загрузке файла ' + file.name);
          processNext(index + 1);
        });
      };
      reader.readAsDataURL(file);
    }
    processNext(0);
  });
});
