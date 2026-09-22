document.addEventListener('DOMContentLoaded', () => {
    const API = window.StopCleanAPI;

    if (!API) {
        console.error('StopCleanAPI não foi carregada.');
        return;
    }

    const form = document.getElementById('formLoginFuncionario');
    const inputEmail = document.getElementById('email');
    const inputSenha = document.getElementById('senha');
    const btnSubmit = document.getElementById('btnSubmit');
    const alertError = document.getElementById('alert-error');
    const alertMessage = document.getElementById('alert-message');
    const toggleSenha = document.getElementById('toggleSenha');

    // Se já existe sessão, vai direto para o painel
    if (API.getToken()) {
        window.location.href = 'HomeFuncionario.html';
        return;
    }

    if (toggleSenha && inputSenha) {
        toggleSenha.addEventListener('click', () => {
            const isPassword = inputSenha.type === 'password';

            inputSenha.type = isPassword ? 'text' : 'password';

            toggleSenha.classList.toggle('ti-eye', !isPassword);
            toggleSenha.classList.toggle('ti-eye-off', isPassword);
        });
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = inputEmail.value.trim();
        const senha = inputSenha.value.trim();

        if (!email || !senha) {
            showError('Preencha todos os campos para continuar.');
            return;
        }

        setLoading(true);

        try {
            const data = await API.post(
                '/funcionarios/login',
                {
                    email,
                    senha
                },
                {
                    auth: false
                }
            );

            if (!data?.token) {
                throw new Error('O servidor não retornou um token.');
            }

            API.salvarSessao(
                data.token,
                data.usuario
            );

            window.location.href = 'HomeFuncionario.html';

        } catch (error) {
            console.error('Erro na autenticação:', error);
            showError(error.message || 'Não foi possível realizar o login.');
        } finally {
            setLoading(false);
        }
    });

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