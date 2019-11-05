import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {}

  onSubmit(form: NgForm) {
    if (form.value.emailId === 'provider' && form.value.password === '123456') {
      this.router.navigate(['home']);
    } else {
      alert('Invalid Login Details');
    }
  }
}
