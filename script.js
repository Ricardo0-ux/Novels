class NovelApp {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api';
    this.currentUser = null;
    this.currentPage = 1;
    this.initElements();
    this.initEventListeners();
    this.checkAuthStatus();
    this.loadNovels();
  }

  initElements() {
    this.elements = {
      novelList: document.getElementById('novelList'),
      searchInput: document.getElementById('searchInput'),
      searchButton: document.getElementById('searchButton'),
      authButtons: document.getElementById('authButtons'),
      loginButton: document.getElementById('loginButton'),
      registerButton: document.getElementById('registerButton'),
      loginModal: document.getElementById('loginModal'),
      registerModal: document.getElementById('registerModal'),
      loginForm: document.getElementById('loginForm'),
      registerForm: document.getElementById('registerForm'),
      cancelLogin: document.getElementById('cancelLogin'),
      cancelRegister: document.getElementById('cancelRegister'),
      loginError: document.getElementById('loginError'),
      registerError: document.getElementById('registerError')
    };
  }

  initEventListeners() {
    this.elements.searchButton.addEventListener('click', () => this.searchNovels());
    this.elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchNovels();
    });
    
    this.elements.loginButton.addEventListener('click', () => this.showModal('login'));
    this.elements.registerButton.addEventListener('click', () => this.showModal('register'));
    this.elements.cancelLogin.addEventListener('click', () => this.hideModal('login'));
    this.elements.cancelRegister.addEventListener('click', () => this.hideModal('register'));
    
    this.elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
    
    this.elements.registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });
  }

  async checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        this.updateAuthUI();
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      localStorage.removeItem('token');
    }
  }

  updateAuthUI() {
    if (this.currentUser) {
      this.elements.authButtons.innerHTML = `
        <span>Olá, ${this.currentUser.username}</span>
        <button id="logoutButton"><i class="fas fa-sign-out-alt"></i> Sair</button>
        <button id="addNovelButton"><i class="fas fa-plus"></i> Adicionar Novel</button>
      `;
      
      document.getElementById('logoutButton').addEventListener('click', () => this.logout());
      document.getElementById('addNovelButton').addEventListener('click', () => this.showAddNovelForm());
    } else {
      this.elements.authButtons.innerHTML = `
        <button id="loginButton"><i class="fas fa-sign-in-alt"></i> Login</button>
        <button id="registerButton"><i class="fas fa-user-plus"></i> Registrar</button>
      `;
      
      document.getElementById('loginButton').addEventListener('click', () => this.showModal('login'));
      document.getElementById('registerButton').addEventListener('click', () => this.showModal('register'));
    }
  }

  showModal(type) {
    if (type === 'login') {
      this.elements.loginModal.style.display = 'block';
      this.elements.registerModal.style.display = 'none';
    } else {
      this.elements.loginModal.style.display = 'none';
      this.elements.registerModal.style.display = 'block';
    }
  }

  hideModal(type) {
    if (type === 'login') {
      this.elements.loginModal.style.display = 'none';
      this.elements.loginError.style.display = 'none';
      this.elements.loginForm.reset();
    } else {
      this.elements.registerModal.style.display = 'none';
      this.elements.registerError.style.display = 'none';
      this.elements.registerForm.reset();
    }
  }

  async handleLogin() {
    const username = this.elements.loginUsername.value;
    const password = this.elements.loginPassword.value;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        this.currentUser = data.user;
        this.updateAuthUI();
        this.hideModal('login');
        this.loadNovels();
      } else {
        const error = await response.json();
        this.showLoginError(error.error || 'Erro ao fazer login');
      }
    } catch (error) {
      this.showLoginError('Erro de conexão');
    }
  }

  async handleRegister() {
    const username = this.elements.registerUsername.value;
    const password = this.elements.registerPassword.value;
    const confirmPassword = this.elements.registerConfirmPassword.value;
    
    if (password !== confirmPassword) {
      this.showRegisterError('As senhas não coincidem');
      return;
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        this.currentUser = data.user;
        this.updateAuthUI();
        this.hideModal('register');
        this.loadNovels();
      } else {
        const error = await response.json();
        this.showRegisterError(error.error || 'Erro ao registrar');
      }
    } catch (error) {
      this.showRegisterError('Erro de conexão');
    }
  }

  showLoginError(message) {
    this.elements.loginError.textContent = message;
    this.elements.loginError.style.display = 'block';
  }

  showRegisterError(message) {
    this.elements.registerError.textContent = message;
    this.elements.registerError.style.display = 'block';
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUser = null;
    this.updateAuthUI();
    this.loadNovels();
  }

  async loadNovels(page = 1) {
    this.currentPage = page;
    this.elements.novelList.innerHTML = '<div class="loading">Carregando novels...</div>';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/novels?page=${page}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar novels');
      }
      
      const data = await response.json();
      this.displayNovels(data);
    } catch (error) {
      this.elements.novelList.innerHTML = `
        <div class="error">
          Erro ao carregar novels: ${error.message}
          <button onclick="app.loadNovels()">Tentar novamente</button>
        </div>
      `;
    }
  }

  displayNovels(data) {
    if (data.data.length === 0) {
      this.elements.novelList.innerHTML = '<div class="loading">Nenhuma novel encontrada</div>';
      return;
    }
    
    let html = '';
    
    data.data.forEach(novel => {
      html += `
        <div class="novel" data-id="${novel.id}">
          <h2>${novel.title}</h2>
          <div class="meta">
            <span><strong>Autor:</strong> ${novel.author}</span> | 
            <span><strong>Gênero:</strong> ${novel.genre || 'Não especificado'}</span> | 
            <span><strong>Status:</strong> ${novel.status}</span>
          </div>
          <div class="description">${novel.description || 'Sem descrição'}</div>
          <button onclick="app.viewNovel(${novel.id})">Ver capítulos</button>
          ${this.currentUser && this.currentUser.id === novel.user_id ? `
            <button onclick="app.editNovel(${novel.id})">Editar</button>
            <button onclick="app.deleteNovel(${novel.id})">Excluir</button>
          ` : ''}
        </div>
      `;
    });
    
    // Adiciona paginação
    if (data.pagination.pages > 1) {
      html += '<div class="pagination">';
      
      if (data.pagination.page > 1) {
        html += `<button onclick="app.loadNovels(${data.pagination.page - 1})">Anterior</button>`;
      }
      
      for (let i = 1; i <= data.pagination.pages; i++) {
        if (i === data.pagination.page) {
          html += `<button disabled>${i}</button>`;
        } else {
          html += `<button onclick="app.loadNovels(${i})">${i}</button>`;
        }
      }
      
      if (data.pagination.page < data.pagination.pages) {
        html += `<button onclick="app.loadNovels(${data.pagination.page + 1})">Próxima</button>`;
      }
      
      html += '</div>';
    }
    
    this.elements.novelList.innerHTML = html;
  }

  async searchNovels() {
    const query = this.elements.searchInput.value.trim();
    if (!query) return this.loadNovels();
    
    this.elements.novelList.innerHTML = '<div class="loading">Buscando novels...</div>';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/novels/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Erro na busca');
      }
      
      const data = await response.json();
      this.displayNovels(data);
    } catch (error) {
      this.elements.novelList.innerHTML = `
        <div class="error">
          Erro na busca: ${error.message}
          <button onclick="app.loadNovels()">Voltar para lista completa</button>
        </div>
      `;
    }
  }

  viewNovel(id) {
    // Implementar visualização de capítulos
    console.log('View novel:', id);
  }

  editNovel(id) {
    // Implementar edição de novel
    console.log('Edit novel:', id);
  }

  deleteNovel(id) {
    if (!confirm('Tem certeza que deseja excluir esta novel?')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    fetch(`${this.apiBaseUrl}/novels/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
      if (response.ok) {
        this.loadNovels();
      } else {
        throw new Error('Erro ao excluir novel');
      }
    })
    .catch(error => {
      alert(error.message);
    });
  }

  showAddNovelForm() {
    // Implementar formulário para adicionar nova novel
    console.log('Add new novel');
  }
}

// Inicializa a aplicação
const app = new NovelApp();
