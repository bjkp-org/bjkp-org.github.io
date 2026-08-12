document.getElementById('memberForm').addEventListener('submit',function(e){
 e.preventDefault();
 const f=new FormData(this);
 const id='BJKP-'+Date.now().toString().slice(-8);
 document.getElementById('result').innerHTML='<b>आवेदन प्राप्त हुआ!</b><br>आवेदन ID: '+id+'<br>आपका वास्तविक ऑनलाइन रिकॉर्ड सुरक्षित रखने के लिए वेबसाइट को backend/database से जोड़ना आवश्यक है।';
 this.reset();
});