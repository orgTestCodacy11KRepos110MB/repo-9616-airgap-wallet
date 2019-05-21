import { ComponentFixture, TestBed } from '@angular/core/testing'
import { QRScanner } from '@ionic-native/qr-scanner/ngx'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { PortfolioPage } from './portfolio'

describe('PortfolioPage', () => {
  let component: PortfolioPage
  let fixture: ComponentFixture<PortfolioPage>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()
    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [QRScanner],
        declarations: [PortfolioPage]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(PortfolioPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
