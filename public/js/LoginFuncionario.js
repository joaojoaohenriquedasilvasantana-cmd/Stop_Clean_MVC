import * as ApiModule from './api.js';

const API_BASE_URL = ApiModule.default || ApiModule.API_BASE_URL || ApiModule.baseUrl || '';

document.addEventListener('DOMContentLoaded', () => {
    const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

    const form = document.getElementById('formLoginFuncionario');
    const inputIdentifier = document.getElementById('identifier');
    const inputSenha = document.getElementById('senha');
    const btnSubmit = document.getElementById('btnSubmit');
    const alertError = document.getElementById('alert-error');
    const alertMessage = document.getElementById('alert-message');
    const toggleSenha = document.getElementById('toggleSenha');

    if (localStorage.getItem('token')) {
        window.location.href = 'HomeFuncionario.html';
        return;
    }

    if (toggleSenha && inputSenha) {
        toggleSenha.addEventListener('click', () => {
            const isPassword = inputSenha.getAttribute('type') === 'password';
            inputSenha.setAttribute('type', isPassword ? 'text' : 'password');
            toggleSenha.classList.toggle('ti-eye', !isPassword);
            toggleSenha.classList.toggle('ti-eye-off', isPassword);
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const identifier = inputIdentifier ? inputIdentifier.value.trim() : '';
            const senha = inputSenha ? inputSenha.value.trim() : '';

            if (!identifier || !senha) {
                showError('Preencha todos os campos para continuar.');
                return;
            }

            setLoading(true);

            try {
                const payload = {
                    login: identifier,
                    email: identifier,
                    cpf: identifier,
                    senha: senha
                };

                const response = await fetch(`${baseUrl}/funcionarios/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // Verifica se o servidor retornou JSON válido
                const contentType = response.headers.get('content-type');
                let data = {};

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    throw new Error(`Rota de login não encontrada no servidor (${response.status}). Verifique a URL da API.`);
                }

                if (!response.ok) {
                    throw new Error(data.message || data.mensagem || data.error || 'Credenciais inválidas.');
                }

                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                if (data.funcionario) {
                    localStorage.setItem('funcionario', JSON.stringify(data.funcionario));
                }

                window.location.href = 'HomeFuncionario.html';

            } catch (error) {
                console.error('Erro na autenticação:', error);
                showError(error.message || 'Não foi possível conectar ao servidor.');
            } finally {
                setLoading(false);
            }
        });
    }

    function showError(msg) {
        if (alertMessage && alertError) {
            alertMessage.textContent = msg;
            alertError.classList.remove('hidden');
        } else {
            alert(msg);
        }
    }

    function hideError() {
        if (alertError) {
            alertError.classList.add('hidden');
        }
    }

    function setLoading(isLoading) {
        if (!btnSubmit) return;
        btnSubmit.disabled = isLoading;
        btnSubmit.innerHTML = isLoading 
            ? `<i class="ti ti-loader-2 spin"></i> Verificando...` 
            : `<span>Entrar no Painel</span> <i class="ti ti-arrow-right"></i>`;
    }
});