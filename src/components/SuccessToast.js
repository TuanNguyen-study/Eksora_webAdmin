import Swal from 'sweetalert2';

// Toast thành công dùng chung
export function launchSuccessToast(message = 'Thành công!') {
  Swal.fire({
    icon: 'success',
    title: 'Thành công',
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#fff',
    color: '#28a745',
  });
}
