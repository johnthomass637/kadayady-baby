import { Injectable } from '@angular/core';

// Ai api Client
import { ApiAiClient } from '../client/ApiAiClient';

// RxJs modules
import { BehaviorSubject } from 'rxjs';
import { SpeechSynthesizerService } from './speech-synthesizer.service';

import { HttpClient, HttpHeaders } from '@angular/common/http';

export class Message {
  constructor(
    public content: string,
    public sendBy: ESendBy,
    public options: string[]
  ) {}
}

export enum ESendBy {
  user = 'user',
  bot = 'bot'
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private client;
  questions = [];
  answers = [];
  isMemberIdQuestion = false;
  memberId = '';

  conversation = new BehaviorSubject<Message[]>([]);

  constructor(
    private speechSynthesizer: SpeechSynthesizerService,
    private http: HttpClient
  ) {}

  public converse(msg: string) {
    if (!isNaN(Number(msg.replace(/ /g, ''))) || msg.indexOf('/') > -1) {
      msg = msg.replace(/ /g, '');
    }
    this.answers.push(msg);
    const userMessage = new Message(msg, ESendBy.user, []);
    this.update(userMessage);
    return this.client.textRequest(msg).then(res => {
      if (this.isMemberIdQuestion) {
        this.memberId = msg;
        this.isMemberIdQuestion = false;
        this.validateMember(res.session);
      }
      const speech = res.response;
      let options = res.options;
      if (speech[0].indexOf('Anthem Bot') > -1) {
        options = ['Case creation', 'Case status inquiry', 'HRS Assessment'];
      }
      this.questions.push(speech[0]);
      if (speech[0].indexOf('12 digit Member ID') > -1) {
        this.memberId = '';
        this.isMemberIdQuestion = true;
        this.continueConversation(speech, res.session, options);
      } else if (speech[0].indexOf('Thank') > -1) {
        this.findRequestScenario();
      } else if (this.memberId === '') {
        this.continueConversation(speech, res.session, options);
      }
    });
  }

  public continueConversation(msg, session, options) {
    this.speechSynthesizer.speak(msg, 'en-US');
    this.client.setSession(session);
    const botMessage = new Message(msg, ESendBy.bot, options);
    this.update(botMessage);
  }

  public terminateConversation(finalMsg) {
    this.speechSynthesizer.speak(finalMsg, 'en-US');
    this.client.setSession(null);
    const botMessage = new Message(finalMsg, ESendBy.bot, []);
    this.update(botMessage);
  }

  public validateMember(session) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
    };
    this.http
      .get('http://localhost:8081/api/getbyId/' + this.memberId, httpOptions)
      .subscribe(
        res => {
          const status = res['MSG'];
          if (status === 'SUCCESS') {
            const msg = this.questions[this.questions.length - 1];
            this.memberId = '';
            this.continueConversation(
              'Validation Successful. ' + msg,
              session,
              []
            );
          } else {
            this.isMemberIdQuestion = true;
            this.continueConversation(
              'Sorry! Your member id is invalid. Please provide the Correct Member ID',
              session,
              []
            );
          }
        },
        err => {
          this.terminateConversation(
            'Sorry! There is a problem in reaching the server. Please try again after some time.'
          );
        }
      );
  }

  public findRequestScenario() {
    if (
      this.questions.indexOf(
        'I am glad to assist you. May i know for whom this case is being created?'
      ) > -1
    ) {
      this.processCaseCreationData();
    } else if (
      this.questions.indexOf('Do you want to take the assessments now?') > -1
    ) {
      this.processHRSAssessmentData();
    } else if (
      this.questions.indexOf(
        'Thank you for your patience. Status of your case is'
      ) > -1
    ) {
      this.processCaseStatusInquiryData();
    }
  }

  public processCaseCreationData() {
    const memId = this.answers[
      this.questions.lastIndexOf('Please provide the 12 digit Member ID') + 1
    ];
    const memName = this.answers[
      this.questions.lastIndexOf('Please provide the Name of the member') + 1
    ];
    const memDoB = this.answers[
      this.questions.lastIndexOf(
        'Please provide the Date of birth of the member'
      ) + 1
    ];
    const servicePrvId = this.answers[
      this.questions.lastIndexOf(
        'Could you please provide the 10 digit Provider ID of servicing provider?'
      ) + 1
    ];
    const requestPrvId = this.answers[
      this.questions.lastIndexOf(
        'Please provide the 10 digit Provider ID of the requesting provider'
      ) + 1
    ];
    const diagnosticCode = this.answers[
      this.questions.lastIndexOf(
        'Please provide the 4 digit Diagnostic code also'
      ) + 1
    ];
    const procedureCode = this.answers[
      this.questions.lastIndexOf(
        'Could you please provide the 3 digit Procedure code of the planned procedure?'
      ) + 1
    ];
    const startDt = this.answers[
      this.questions.lastIndexOf('Please provide the service start date') + 1
    ];
    const endDt = this.answers[
      this.questions.lastIndexOf('Please provide the service end date') + 1
    ];
    const data = JSON.stringify({
      memberid: memId,
      memname: memName,
      dateofbirth: memDoB,
      servicepvdid: servicePrvId,
      requestpvdid: requestPrvId,
      diagcode: diagnosticCode,
      procode: procedureCode,
      startdate: startDt,
      enddate: endDt,
	  CallType: 'ChatBot',
      status: 'Resolved-Completed',
	  MMSStatus: 'PENDING'
    });
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
    };

    this.http
      .post('http://localhost:3000/api/saveCase/', data, httpOptions)
      .subscribe(
        res => {
          this.terminateConversation(this.questions[this.questions.length - 1]);
        },
        err => {
          this.terminateConversation(
            'Sorry! Your case is not created. There is a problem in reaching the server. Please try again after some time.'
          );
        }
      );
  }

  public processHRSAssessmentData() {
    const memId = this.answers[
      this.questions.lastIndexOf('Please provide the 12 digit Member ID') + 1
    ];
    const memFirstName = this.answers[
      this.questions.lastIndexOf(
        "Could you please provide Member's First name"
      ) + 1
    ];
    let memLastName = '';
    if (this.questions.lastIndexOf("May i know the member's lastname") > -1) {
      memLastName = this.answers[
        this.questions.lastIndexOf("May i know the member's lastname") + 1
      ];
    } else {
      memLastName = this.answers[
        this.questions.lastIndexOf("May i  know the member's lastname") + 1
      ];
    }
    const memContactDate = this.answers[
      this.questions.lastIndexOf('May I know the date of contact') + 1
    ];
    const memVisitLocation = this.answers[
      this.questions.lastIndexOf(
        'Please mention the visit location of the member'
      ) + 1
    ];
    const memContactPerson = this.answers[
      this.questions.lastIndexOf('May i know the contact person') + 1
    ];
    const memContactPersonName = this.answers[
      this.questions.lastIndexOf(
        'Could you please provide contact persons name'
      ) + 1
    ];
    const isInterDisciplinary = this.answers[
      this.questions.lastIndexOf(
        'Did this contact include the interdisciplinary team members chosen by the member'
      ) + 1
    ];
    const isEligibilityIssue = this.answers[
      this.questions.lastIndexOf(
        'Is the member experiencing eligibility issue?'
      ) + 1
    ];
    const areServiceAuthorized = this.answers[
      this.questions.lastIndexOf(
        'Are the member service correctly authorized?'
      ) + 1
    ];
    const memPhysicalCondition = this.answers[
      this.questions.lastIndexOf("How is the Member's Physical condition") + 1
    ];
    const doActionsRequired = this.answers[
      this.questions.lastIndexOf(
        'Whether any actions required to address the members physical change?'
      ) + 1
    ];
    const isUpcomingAppointments = this.answers[
      this.questions.lastIndexOf('Any upcoming medical Appointments') + 1
    ];
    const memPhysicalEnvironment = this.answers[
      this.questions.lastIndexOf('How is the members physical Environment') + 1
    ];
    const patientsMood = this.answers[
      this.questions.lastIndexOf(
        'How was the patients mood and emotional well -being?'
      ) + 1
    ];
    const anyRecentFalls = this.answers[
      this.questions.lastIndexOf('Any Recent Falls?') + 1
    ];
    const isMemSatisfied = this.answers[
      this.questions.lastIndexOf(
        'Is member satisfied with current services and care?'
      ) + 1
    ];
    const anyRiskIdentified = this.answers[
      this.questions.lastIndexOf('Were any risks identified for a member') + 1
    ];
    const restrictiveIntervention = this.answers[
      this.questions.lastIndexOf(
        'Restrictive intervention where applied for the member in the plan of care?'
      ) + 1
    ];
    const meetingResult = this.answers[
      this.questions.lastIndexOf(
        'Did the meeting result change in the plane of care?'
      ) + 1
    ];
    const answeredPerson = this.answers[
      this.questions.lastIndexOf(
        'ok, Can you please tell the name who answered this conversation'
      ) + 1
    ];

    const data = JSON.stringify({
      memberid: memId,
      memfirstname: memFirstName,
      memlastname: memLastName,
      cntdate: memContactDate,
      assesstype: 'face to face',
      status: 'PENDING',
      locofvis: memVisitLocation,
      cntentity: memContactPerson,
      cntname: memContactPersonName,
      intdispmem: isInterDisciplinary,
      elgbleissue: isEligibilityIssue,
      memserve: areServiceAuthorized,
      servegap: 'NA',
      phycond: memPhysicalCondition,
      phychange: doActionsRequired,
      medappnt: isUpcomingAppointments,
      phyenv: memPhysicalEnvironment,
      moodemo: patientsMood,
      recfall: anyRecentFalls,
      servcare: isMemSatisfied,
      memrisk: anyRiskIdentified,
      restintrv: restrictiveIntervention,
      memresult: meetingResult,
      othtopic: 'We discussed about his life style',
      nursename: answeredPerson
    });
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
    };

    this.http
      .post('http://localhost:4000/api/saveMember/', data, httpOptions)
      .subscribe(
        res => {
          this.terminateConversation(this.questions[this.questions.length - 1]);
        },
        err => {
          this.terminateConversation(
            'Sorry! Your assessment is not updated in LTSS. There is a problem in reaching the server. Please try again after some time.'
          );
        }
      );
  }

  public processCaseStatusInquiryData() {
    const memId = this.answers[
      this.questions.lastIndexOf('Please provide the name of the patient')
    ];

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
    };
    this.http
      .get('http://localhost:3000/api/getCasememberid/' + memId, httpOptions)
      .subscribe(
        res => {
          const MMSStatus = res['MMSStatus'];
          const finalMsg =
            'Thank you for your patience. Status of your case is ' + MMSStatus;
          this.terminateConversation(finalMsg);
        },
        err => {
          this.terminateConversation(
            'Sorry! There is a problem in reaching the server. Please try again after some time.'
          );
        }
      );
  }

  public update(msg: Message) {
    this.conversation.next([msg]);
  }

  public init(serviceid: string) {
    this.client = new ApiAiClient({ serviceid: serviceid, session: null });
  }
}
