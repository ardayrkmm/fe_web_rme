import { forwardRef } from 'react';

interface PrintableMedicalRecordProps {
  record?: any;
  records?: any[];
}

export const PrintableMedicalRecord = forwardRef<HTMLDivElement, PrintableMedicalRecordProps>(
  ({ record, records }, ref) => {
    const recordsToPrint = records && records.length > 0 ? records : (record ? [record] : []);
    if (recordsToPrint.length === 0) return null;

    // Ambil data pasien dari record pertama (karena patient ID nya sama)
    const patient = recordsToPrint[0].patient || {};

    // Helper to calculate age if dob exists
    const calculateAge = (dob: string) => {
      if (!dob) return '-';
      const diffMs = Date.now() - new Date(dob).getTime();
      const ageDt = new Date(diffMs); 
      return Math.abs(ageDt.getUTCFullYear() - 1970) + " Tahun";
    };

    const birthDateStr = patient.birth_date 
      ? new Date(patient.birth_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) 
      : '-';

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-screen printable-area">
        {/* Kop Surat */}
        <div className="border-b-4 border-double border-slate-800 pb-4 mb-6 flex items-center justify-center text-center">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-800 uppercase tracking-wide">
              Arummy Fisioterapi
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Terapi Rehabilitasi Fisik Profesional<br />
              Neuro &bull; Muskuloskeletal &bull; Pediatric<br />
              Bhayangkara Residence Klampok BlokA8, Wanasari, Brebes
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center underline mb-8">
          HASIL REKAM MEDIS
        </h2>

        {/* Data Pasien */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg border-b border-slate-300 pb-1 mb-3">
            Identitas Pasien
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="w-1/4 py-1 font-medium">No. Rekam Medis</td>
                <td className="w-4 py-1">:</td>
                <td className="py-1">{patient.medical_record_number || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Kategori</td>
                <td className="py-1">:</td>
                <td className="py-1">{patient.category?.name || patient.patient_category_id || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Nomor Identitas (NIK)</td>
                <td className="py-1">:</td>
                <td className="py-1">{patient.nik || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Nama Pasien</td>
                <td className="py-1">:</td>
                <td className="py-1 font-bold">{patient.name || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Status Pernikahan</td>
                <td className="py-1">:</td>
                <td className="py-1">{patient.marital_status || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Jenis Kelamin</td>
                <td className="py-1">:</td>
                <td className="py-1">
                  {patient.gender_data?.name || patient.gender_id || '-'}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Tanggal Lahir</td>
                <td className="py-1">:</td>
                <td className="py-1">{birthDateStr}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Usia</td>
                <td className="py-1">:</td>
                <td className="py-1">{calculateAge(patient.birth_date)}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium">Pekerjaan</td>
                <td className="py-1">:</td>
                <td className="py-1">{patient.occupation || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Loop untuk Rekap Rekam Medis */}
        {recordsToPrint.map((rec, index) => {
          const physio = rec.physiotherapist || {};
          const service = rec.service || {};
          
          const examDate = rec.examination_date
            ? new Date(rec.examination_date).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : '-';

          return (
            <div key={rec.id || index} className="mb-10">
              <h3 className="font-semibold text-lg border-b border-slate-300 pb-1 mb-3">
                Rekap Pemeriksaan {recordsToPrint.length > 1 ? `#${index + 1}` : ''}
              </h3>
              <table className="w-full text-sm mb-4">
                <tbody>
                  <tr>
                    <td className="w-1/4 py-1 font-medium">No. Kunjungan</td>
                    <td className="w-4 py-1">:</td>
                    <td className="py-1 font-bold text-slate-800">{rec.visit_number || '-'}</td>
                  </tr>
                  <tr>
                    <td className="w-1/4 py-1 font-medium">Tanggal Pemeriksaan</td>
                    <td className="w-4 py-1">:</td>
                    <td className="py-1">{examDate}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-medium">Jenis Layanan</td>
                    <td className="py-1">:</td>
                    <td className="py-1">{service.name || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-medium">Fisioterapis</td>
                    <td className="py-1">:</td>
                    <td className="py-1">{physio.name || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Hasil Anamnesis:</h4>
                  <div className="p-3 border border-slate-200 rounded min-h-[60px] whitespace-pre-wrap">
                    {rec.anamnesis || '-'}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Diagnosa:</h4>
                  <div className="p-3 border border-slate-200 rounded min-h-[60px] whitespace-pre-wrap">
                    {rec.diagnosis || '-'}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Terapi yang diberikan:</h4>
                  <div className="p-3 border border-slate-200 rounded min-h-[60px] whitespace-pre-wrap">
                    {rec.therapy || '-'}
                  </div>
                </div>
              </div>

              {/* Tanda tangan untuk masing-masing pemeriksaan jika cetak banyak, atau di bawah jika cuma satu */}
              <div className="mt-8 flex justify-end">
                <div className="text-center">
                  <p className="text-sm mb-16">Pemeriksa,</p>
                  <p className="font-bold underline text-sm">{physio.name || '.....................................'}</p>
                  <p className="text-xs text-slate-500">SIP: {physio.sip || '-'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);
