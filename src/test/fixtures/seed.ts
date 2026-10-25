import type { StoreState, HomeworkGrade, Member } from "../../data/types";
import { defaultRoles, MEMBER_IDS, ROLE_IDS } from "../../data/defaults";

/** Small, synthetic-only data set for web feature tests. Never imported by app code. */
export function createSeed(): StoreState {
  const state: StoreState = {
    classes: [
      { id:"6a", name:"Tiếng Anh giao tiếp 6A", weekdays:[1,3], time:"18:00", teacherName:"Cô Lan", status:"active" },
      { id:"ielts", name:"IELTS 7.0", weekdays:[2,4], time:"19:30", teacherName:null, status:"active" },
      ], students: [], sessions: [], attendance: [], tests: [], scores: [], comments: [], homeworkSections: [], homeworkGrades: [], reportBatches: [], reports: [], reportPublications: [], changeLogs: [], pending: [],
    auth: { phone:"fixture-user", memberIds:[MEMBER_IDS.lanAdmin, MEMBER_IDS.lanTeacher] }, currentClassId:"6a", roles:defaultRoles(), members:[], activeMemberId:MEMBER_IDS.lanAdmin,
  };
  const names=["Nguyễn Minh Anh","Trần Gia Bảo","Lê Khánh Chi","Phạm Đức Dũng","Hoàng Thu Hà","Vũ Quang Huy","Đặng Ngọc Lan","Bùi Tuấn Kiệt","Ngô Bảo Ngọc","Đỗ Hải Nam"];
  const dates=["2026-09-21","2026-09-23","2026-09-28","2026-09-30","2026-10-05","2026-10-07","2026-10-12","2026-10-14","2026-10-19"];
  for (const [classId, classDates] of [["6a",dates],["ielts",["2026-09-22","2026-09-24","2026-09-29","2026-10-01","2026-10-06","2026-10-08","2026-10-13","2026-10-15","2026-10-20"]]] as const) {
    classDates.forEach((date,i)=>state.sessions.push({id:`${classId}-session-${i}`,classId,date,time:classId==="6a"?"18:00":"19:30",origin:"recurring",status:i===8?"planned":"held"}));
    if(classId==="6a") state.sessions.push({id:"6a-extra-session",classId,date:"2026-10-25",time:"17:00",origin:"manual",note:"Buổi học bù",makeup:true,status:"planned"},{id:"6a-extra-cancelled",classId,date:"2026-10-16",time:"18:00",origin:"manual",note:"Buổi bù bị hủy",makeup:true,status:"cancelled"});
    state.reportBatches.push({id:`${classId}-batch`,classId,fromSessionId:`${classId}-session-0`,toSessionId:`${classId}-session-7`,fromKey:`${classDates[0]} ${classId==="6a"?"18:00":"19:30"}`,toKey:`${classDates[7]} ${classId==="6a"?"18:00":"19:30"}`});
    names.forEach((name,i)=>{
      const studentId=`${classId}-student-${i}`; const left=i===9&&classId==="6a";
      state.students.push({id:studentId,classId,name,parentPhone:"",enrolledAt:"2026-09-01",leftAt:left?"2026-10-09":null,status:left?"left":"active"});
      classDates.slice(0,8).forEach((date,j)=>{ if(left&&date>"2026-10-09")return; const status=i===0&&j>=6?"absent":i===1&&j===7?"excused":i===2&&j===7?"late":"present"; state.attendance.push({id:`${classId}-attendance-${i}-${j}`,sessionId:`${classId}-session-${j}`,studentId,status,note:"",lateAt:status==="late"?"18:10":null}); });
        for(let j=0;j<4;j++) state.scores.push({id:`${classId}-score-${i}-${j}`,testId:`${classId}-test-${j}`,studentId,value:i===3&&j===3?null:classId==="6a"&&i===1&&j===2?10:classId==="6a"&&i===1&&j===3?9:6+((i+j)%5)});
      state.reports.push({id:`${studentId}-report`,classId,studentId,batchId:`${classId}-batch`,month:"2026-10",status:i<2?"published":"draft",needsRepublish:false,generalComment:i===1&&classId==="6a"?"Nhận xét kiểm thử tổng hợp.":"",publishedAt:i<2?"2026-10-12T09:00:00.000Z":null});
    });
  for(let j=0;j<4;j++) state.tests.push({id:`${classId}-test-${j}`,classId,name:["Từ vựng","Ngữ pháp","Nghe","Nói"][j],date:classDates[j+3],archived:false});
  }
  const admin:Member={id:MEMBER_IDS.lanAdmin,name:"Admin Fixture",phone:"fixture-user",roleId:ROLE_IDS.admin,classIds:[],status:"active"};
    const teacher:Member={id:MEMBER_IDS.lanTeacher,name:"Teacher Fixture",phone:"fixture-user",roleId:ROLE_IDS.teacher,classIds:["6a"],status:"active"};
      const assistant:Member={id:MEMBER_IDS.trang,name:"Assistant Fixture",phone:"fixture-assistant",roleId:ROLE_IDS.assistant,classIds:["6a"],status:"active"};
      const guardian:Member={id:MEMBER_IDS.lanGuardian,name:"Guardian Fixture",phone:"900000001",roleId:ROLE_IDS.guardian,classIds:[],studentIds:["6a-student-1","6a-student-8"],status:"active"};
      const secondGuardian:Member={id:MEMBER_IDS.minhAnhGuardian,name:"Second Guardian Fixture",phone:"fixture-parent-2",roleId:ROLE_IDS.guardian,classIds:[],studentIds:["ielts-student-3"],status:"active"};
      state.members=[admin,teacher,assistant,guardian,secondGuardian];
    for (const [index, stars] of [3,2,1,3].entries()) {
      const sessionIndex = index + 4;
      const sentAt = `${dates[sessionIndex]}T13:14:00.000Z`;
        state.comments.push({id:`fixture-comment-${index}`,classId:"6a",studentId:"6a-student-1",sessionId:`6a-session-${sessionIndex}`,criteria:null,comment:null,scale:3,stars:stars as 1|2|3,note:"Ghi chú kiểm thử.",status:"sent",sendQueued:false,sentAt,updatedAt:sentAt,createdAt:sentAt});
    }
      state.comments.push({id:"fixture-comment-class-2",classId:"6a",studentId:"6a-student-2",sessionId:"6a-session-7",criteria:null,comment:null,scale:3,stars:2,note:"Phiếu kiểm thử.",status:"sent",sendQueued:false,sentAt:"2026-10-14T13:14:00.000Z",updatedAt:"2026-10-14T13:14:00.000Z",createdAt:"2026-10-14T13:14:00.000Z"});
    state.homeworkSections.push({id:"fixture-hw-vocab",sessionId:"6a-session-6",kind:"vocabulary",title:"Từ vựng kiểm thử",description:""},{id:"fixture-hw-exercise",sessionId:"6a-session-6",kind:"exercise",title:"Bài tập kiểm thử",description:""});
    state.homeworkSections.push({id:"fixture-hw-next-vocab",sessionId:"6a-session-7",kind:"vocabulary",title:"Từ vựng ngày 19/10",description:""},{id:"fixture-hw-next-exercise",sessionId:"6a-session-7",kind:"exercise",title:"Bài tập ngày 19/10",description:""});
  const grade=(sectionId:string, studentIds:string[],level:HomeworkGrade["level"])=>studentIds.forEach(studentId=>state.homeworkGrades.push({sectionId,studentId,level}));
  grade("fixture-hw-vocab",["6a-student-1","6a-student-2","6a-student-3"],"done");
  grade("fixture-hw-exercise",["6a-student-1","6a-student-2"],"excellent");
  return state;
}
export function resetSeed(): void { /* fixture callers replace the store explicitly */ }
