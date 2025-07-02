import axios from 'axios';

// Hàm upload ảnh lên Cloudinary
export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'EKSORA'); // Thay bằng upload_preset của bạn
  // Nếu dùng folder riêng: formData.append('folder', 'tour-images');
  const cloudName = 'dxxb1bgws'; // Thay bằng cloud name của bạn
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  try {
    const res = await axios.post(url, formData);
    return res.data.secure_url;
  } catch (err) {
    throw err;
  }
};
