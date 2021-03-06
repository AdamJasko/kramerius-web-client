import { AccountService } from './../services/account.service';
import { DialogCitationComponent } from './../dialog/dialog-citation/dialog-citation.component';
import { DialogAuthosComponent } from './../dialog/dialog-authors/dialog-authors.component';
import { AppSettings } from './../services/app-settings';
import { Metadata } from './../model/metadata.model';
import { Component, OnInit, Input } from '@angular/core';
import { MzModalService } from 'ngx-materialize';
import { AnalyticsService } from '../services/analytics.service';
import { DialogShareComponent } from '../dialog/dialog-share/dialog-share.component';
import { DialogAdminMetadataComponent } from '../dialog/dialog-admin-metadata/dialog-admin-metadata.component';

@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html'
})
export class MetadataComponent implements OnInit {
  public controlsEnabled = true;

  @Input() set showControls(value: boolean) {
    this.controlsEnabled = value;
  }
  @Input() metadata: Metadata;
  showingTitle = false;

  constructor(private modalService: MzModalService,
              public analytics: AnalyticsService,
              public account: AccountService,
              public appSettings: AppSettings) { }

  ngOnInit() {
  }

  showTitle() {
    this.showingTitle = !this.showingTitle;
  }

  openInProarc() {
    window.open(this.metadata.proarcLink(), '_blank');
  }

  showAuthors() {
    this.analytics.sendEvent('metadata', 'authors');
    this.modalService.open(DialogAuthosComponent, { authors: this.metadata.authors} );
  }

  showCitation() {
    this.analytics.sendEvent('metadata', 'citation');
    this.modalService.open(DialogCitationComponent, { metadata: this.metadata });
  }

  onShare() {
    this.analytics.sendEvent('metadata', 'share');
    this.modalService.open(DialogShareComponent, { metadata: this.metadata });
  }

  showAdminMetadata() {
    this.analytics.sendEvent('metadata', 'admin-metadata');
    this.modalService.open(DialogAdminMetadataComponent, { metadata: this.metadata } );
  }

}
