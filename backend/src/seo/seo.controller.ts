import { Controller, Get, Res, Req } from '@nestjs/common';
import { SeoService } from './seo.service';
import { Response, Request } from 'express';

@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  async getSitemapXml(@Req() req: Request, @Res() res: Response) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'mshop.qa';
    const baseUrl = `${protocol}://${host}`;

    const xml = await this.seoService.generateSitemapXml(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=14400');
    return res.send(xml);
  }

  @Get('robots.txt')
  getRobotsTxt(@Req() req: Request, @Res() res: Response) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'mshop.qa';
    const baseUrl = `${protocol}://${host}`;

    const txt = this.seoService.getRobotsTxt(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(txt);
  }
}
