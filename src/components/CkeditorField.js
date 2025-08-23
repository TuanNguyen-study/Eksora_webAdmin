import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { uploadImageToCloudinary } from '../api/cloudinary';

export default function CkeditorField({ value, onChange, name, height = 400 }) {
  // Custom upload adapter cho Cloudinary
  function CustomUploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      return {
        upload: async () => {
          const file = await loader.file;
          const url = await uploadImageToCloudinary(file);
          return { default: url };
        }
      };
    };
  }

  return (
    <div style={{ minHeight: height }}>
      <CKEditor
        editor={ClassicEditor}
        data={value}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange({ target: { name, value: data } });
        }}
        config={{
          toolbar: [
            'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote',
            '|', 'undo', 'redo', 'alignment', 'outdent', 'indent', 'imageUpload', 'mediaEmbed', 'insertTable', 'codeBlock'
          ],
          language: 'vi',
          extraPlugins: [CustomUploadAdapterPlugin],
          // Tăng chiều cao của editor
          height: height,
          // Cấu hình thêm để editor có thể mở rộng
          removePlugins: [],
          // Cho phép resize
          resize_enabled: true,
          resize_dir: 'vertical',
          resize_minHeight: 300,
          resize_maxHeight: 800
        }}
        style={{
          minHeight: height + 'px',
          '& .ck-editor__editable': {
            minHeight: height + 'px'
          }
        }}
      />
    </div>
  );
}
