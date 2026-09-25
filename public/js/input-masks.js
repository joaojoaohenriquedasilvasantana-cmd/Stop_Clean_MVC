// Máscaras e validação de comprimento para CPF, telefone e placa em todas as telas.
(() => {
  const processed = new WeakSet()
  const digits = value => String(value || '').replace(/\D/g, '')
  const plateChars = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const cpfFormat = value => {
    const d = digits(value).slice(0, 11)
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  const phoneFormat = value => {
    const d = digits(value).slice(0, 11)
    if (d.length <= 2) return d.length ? `(${d}` : ''
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }
  const plateFormat = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  function setup() {
    document.querySelectorAll('input').forEach(input => {
      if (processed.has(input)) return
      const id = (input.id || '').toLowerCase()
      const name = (input.name || '').toLowerCase()
      const placeholder = (input.placeholder || '').toLowerCase()
      const isCpf = id.includes('cpf') || name === 'cpf' || placeholder.includes('000.000.000')
      const isPhone = id.includes('telefone') || id.includes('celular') || name.includes('telefone') || name.includes('celular') || placeholder.includes('99999-9999')
      const isPlate = id.includes('placa') || name.includes('placa') || placeholder.includes('abc-1234') || placeholder.includes('abc1d23')
      if (!isCpf && !isPhone && !isPlate) return
      processed.add(input)
      if (isCpf) { input.maxLength = 14; input.inputMode = 'numeric'; input.placeholder ||= '000.000.000-00' }
      if (isPhone) { input.maxLength = 15; input.inputMode = 'tel'; input.placeholder ||= '(11) 99999-9999' }
      if (isPlate) { input.maxLength = 7; input.autocomplete = 'off'; input.placeholder ||= 'ABC1234' }
      const apply = () => {
        const start = input.selectionStart
        const old = input.value
        input.value = isCpf ? cpfFormat(old) : isPhone ? phoneFormat(old) : plateFormat(old)
        input.setCustomValidity('')
        // A formatação preserva o cursor de forma simples para digitação ao final.
        if (document.activeElement === input && start === old.length) input.setSelectionRange(input.value.length, input.value.length)
      }
      input.addEventListener('input', apply)
      input.addEventListener('paste', () => setTimeout(apply, 0))
      input.addEventListener('blur', () => {
        const n = digits(input.value).length
        if (input.value && isCpf && n !== 11) input.setCustomValidity('O CPF deve conter exatamente 11 números.')
        else if (input.value && isPhone && n !== 10 && n !== 11) input.setCustomValidity('O telefone deve conter DDD e 8 ou 9 números.')
        else if (input.value && isPlate && plateLength !== 7) input.setCustomValidity('A placa deve conter exatamente 7 letras/números.')
        else input.setCustomValidity('')
      })
      input.addEventListener('input', () => input.setCustomValidity(''))
    })
    document.querySelectorAll('form').forEach(form => {
      if (form.dataset.maskValidationAttached) return
      form.dataset.maskValidationAttached = 'true'
      form.addEventListener('submit', event => {
      const fields = [...form.querySelectorAll('input')].filter(el => el.willValidate)
      fields.forEach(el => el.dispatchEvent(new Event('blur')))
      if (!form.checkValidity()) { event.preventDefault(); form.reportValidity() }
      }, true)
    })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup)
  else setup()
  new MutationObserver(setup).observe(document.documentElement, { childList: true, subtree: true })
})()
