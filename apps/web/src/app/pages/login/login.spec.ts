import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthState } from '../../auth/auth.state';
import { LoginPage } from './login';

describe('LoginPage', () => {
  let component: LoginPage;
  let authState: { login: jest.Mock };

  beforeEach(async () => {
    authState = { login: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthState, useValue: authState },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows validation error for empty fields', async () => {
    component.email = '';
    component.password = '';
    await component.onSubmit();
    expect(component.error).toBe('Email and password are required.');
  });

  it('calls login on valid form', async () => {
    authState.login.mockResolvedValue(undefined);
    component.email = 'test@example.com';
    component.password = 'pass';
    await component.onSubmit();
    expect(authState.login).toHaveBeenCalledWith('test@example.com', 'pass');
  });

  it('shows error on login failure', async () => {
    authState.login.mockRejectedValue(new Error('fail'));
    component.email = 'test@example.com';
    component.password = 'wrong';
    await component.onSubmit();
    expect(component.error).toBe('Invalid email or password.');
  });
});
