import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { uploadImageToCloudinary } from '../api/cloudinary';

export default function CkeditorField({ value, onChange, name }) {
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
      }}
    />
  );
}
