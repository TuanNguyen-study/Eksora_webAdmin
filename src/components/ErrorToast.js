import Swal from 'sweetalert2';

export function launchErrorToast(message = 'Đã xảy ra lỗi!') {
  Swal.fire({
    icon: 'error',
    title: 'Lỗi',
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#fff',
    color: '#d33',
  });
}
