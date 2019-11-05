import { Component, OnInit } from '@angular/core';
import { Observable, Subject, from } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  public msg: Subject<any> = new Subject();
  public msgArray: Observable<Array<any>> = new Observable<Array<any>>();

  constructor() {}

  ngOnInit() {}

  msgFromChatInput(message: any) {
    this.msg.next(message);
  }

  public onMsgReceive(msg: string) {}
}
