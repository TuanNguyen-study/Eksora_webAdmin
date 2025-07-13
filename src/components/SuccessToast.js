// Toast thành công dùng chung
export function launchSuccessToast(message = 'Thành công!') {
  const event = new CustomEvent('toast', {
    detail: {
      type: 'success',
      message,
    },
  });
  window.dispatchEvent(event);
}
