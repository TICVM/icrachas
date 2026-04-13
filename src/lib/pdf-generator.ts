import jsPDF from 'jspdf';
import { type Student, type BadgeModel } from './types';
import { type BadgeStyleConfig, type TextStyle } from './badge-styles';

const BADGE_BASE_WIDTH = 1063;
const BADGE_BASE_HEIGHT = 768;

async function toDataURL(url: string): Promise<string> {
    if (!url) return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    if (url.startsWith('data:')) return url;
    
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn(`Aviso: Falha ao converter imagem externa para base64 (CORS provável): ${url}`);
        return url;
    }
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
}

export const generatePdf = async (
  students: Student[], 
  fallbackBackground: string, 
  fallbackStyle: BadgeStyleConfig,
  models: BadgeModel[]
) => {
    const a4 = { width: 210, height: 297 };
    const badgesPerLine = 2;
    const badgesPerColumn = 4;
    const totalPerPage = badgesPerLine * badgesPerColumn;
    const marginX = 10;
    const marginY = 10;
    const gapX = 10;
    const gapY = 5;

    const badgeWidth = (a4.width - marginX * 2 - gapX) / badgesPerLine;
    const badgeHeight = badgeWidth * (BADGE_BASE_HEIGHT / BADGE_BASE_WIDTH);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pxToMm = badgeWidth / BADGE_BASE_WIDTH;
    
    const renderTextOnPdf = (text: string, style: TextStyle, badgeX: number, badgeY: number, manualOffsetPx: number = 0) => {
        if (!text || !style) return;

        const boxX = badgeX + (style.x || 0) * pxToMm;
        const boxY = badgeY + (style.y || 0) * pxToMm;
        const boxW = (style.width || 100) * pxToMm;
        const boxH = (style.height || 40) * pxToMm;

        const bgRgb = hexToRgb(style.backgroundColor);
        const bgOpacity = typeof style.backgroundOpacity === 'number' ? style.backgroundOpacity : 0;
        
        if (bgRgb && bgOpacity > 0) {
            pdf.setGState(new (pdf as any).GState({ opacity: bgOpacity }));
            pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
            pdf.roundedRect(
                boxX, 
                boxY, 
                boxW, 
                boxH, 
                (style.backgroundRadius || 0) * pxToMm, 
                (style.backgroundRadius || 0) * pxToMm, 
                'F'
            );
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }

        const textColorRgb = hexToRgb(style.color);
        if(textColorRgb) pdf.setTextColor(textColorRgb.r, textColorRgb.g, textColorRgb.b);
        pdf.setFont('helvetica', style.fontWeight === 'bold' ? 'bold' : 'normal');

        let fontSizeMm = (style.fontSize || 24) * pxToMm * 0.82;
        let pdfFontSizePt = fontSizeMm / 0.3527; 
        pdf.setFontSize(pdfFontSizePt);

        const hOffset = (style.paddingLeft || 0) * pxToMm;
        const vOffset = (style.paddingTop || 0) * pxToMm;
        const maxWidth = boxW - 2;

        // Lógica de Quebra de Linha (Multi-line)
        let lines = [String(text)];
        const textWidth = pdf.getTextWidth(String(text));

        if (textWidth > maxWidth) {
            lines = pdf.splitTextToSize(String(text), maxWidth);
            
            // Se gerou mais de 2 linhas, vamos reduzir o tamanho da fonte
            if (lines.length > 2) {
                while (lines.length > 2 && pdfFontSizePt > 8) {
                    pdfFontSizePt -= 1;
                    pdf.setFontSize(pdfFontSizePt);
                    lines = pdf.splitTextToSize(String(text), maxWidth);
                }
            }
        }

        let align: 'left' | 'center' | 'right' = 'left';
        let drawX = boxX + hOffset + 1;

        if (style.textAlign === 'center') {
            drawX = boxX + boxW / 2;
            align = 'center';
        } else if (style.textAlign === 'right') {
            drawX = boxX + boxW - 1;
            align = 'right';
        }

        const additionalManualOffset = manualOffsetPx * pxToMm;
        // Ajuste vertical baseado no número de linhas para centralizar o bloco
        const lineHeight = pdfFontSizePt * 0.3527 * 1.1;
        const totalTextHeight = lines.length * lineHeight;
        const drawY = boxY + vOffset + (boxH - totalTextHeight) / 2 + (lineHeight / 2) + additionalManualOffset;

        try {
            pdf.text(
                lines,
                drawX,
                drawY,
                { 
                    align: align,
                }
            );
        } catch (err) {
            console.error("Erro no texto do PDF:", err);
        }
    };

    const backgroundCache: Record<string, string> = {};
    const fallbackPhotoUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        try {
            if (i > 0 && i % totalPerPage === 0) pdf.addPage();

            const pos = i % totalPerPage;
            const col = pos % badgesPerLine;
            const row = Math.floor(pos / badgesPerLine);

            const x = marginX + col * (badgeWidth + gapX);
            const y = marginY + row * (badgeHeight + gapY);

            const studentModel = models.find(m => m.id === student.modeloId);
            const currentBackground = studentModel?.fundoCrachaUrl || fallbackBackground;
            const currentStyle = studentModel?.badgeStyle || fallbackStyle;

            // Renderizar Fundo
            try {
                if (!backgroundCache[currentBackground]) {
                    backgroundCache[currentBackground] = await toDataURL(currentBackground);
                }
                const bgData = backgroundCache[currentBackground];
                if (bgData) pdf.addImage(bgData, 'JPEG', x, y, badgeWidth, badgeHeight);
            } catch (e) {
                console.error("Erro fundo PDF:", e);
            }

            // Renderizar Foto (com fallback inteligente)
            try {
                const photoUrl = student.fotoUrl || fallbackPhotoUrl;
                const photoData = await toDataURL(photoUrl);
                
                const px = x + (currentStyle.photo.x || 0) * pxToMm;
                const py = y + (currentStyle.photo.y || 0) * pxToMm;
                const pw = (currentStyle.photo.width || 100) * pxToMm;
                const ph = (currentStyle.photo.height || 100) * pxToMm;
                
                pdf.addImage(photoData, 'JPEG', px, py, pw, ph);

                if (currentStyle.photo.hasBorder && (currentStyle.photo.borderWidth || 0) > 0) {
                    const borderRgb = hexToRgb(currentStyle.photo.borderColor);
                    if (borderRgb) {
                        try {
                            pdf.setGState(new (pdf as any).GState({ opacity: currentStyle.photo.borderOpacity || 1 }));
                        } catch (e) {}
                        pdf.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
                        pdf.setLineWidth((currentStyle.photo.borderWidth || 1) * pxToMm);
                        pdf.roundedRect(px, py, pw, ph, (currentStyle.photo.borderRadius || 0) * pxToMm, (currentStyle.photo.borderRadius || 0) * pxToMm, 'S');
                        try {
                            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.warn("Aviso: Falha na foto do aluno:", student.nome);
            }

            // Renderizar Textos Principais
            renderTextOnPdf(student.nome, currentStyle.name, x, y, 7);
            
            const turmaStyleSincronizado = { 
                ...currentStyle.turma, 
                fontSize: Math.min(currentStyle.turma.fontSize, 36) 
            };
            renderTextOnPdf(student.turma, turmaStyleSincronizado, x, y, -3);
            
            // Renderizar Campos Dinâmicos (Mesma lógica do StudentBadge)
            if (currentStyle.customFields) {
                currentStyle.customFields.forEach((field: any) => {
                    // Tenta buscar o valor pelo mapeamento original, depois por variações
                    const mapping = field.mapping || field.id;
                    const studentAny = student as any;

                    // Busca inteligente (Prioriza exato, depois case-insensitive, depois campos fixos)
                    let val = studentAny[mapping] || 
                                student.customData?.[mapping] || 
                                student.customData?.[mapping.toLowerCase()] ||
                                student.customData?.[field.id] || 
                                student.customData?.[field.label] ||
                                student.customData?.[field.label.toLowerCase()];
                    
                    // Fallback para campos comuns se o mapping for genérico (independente de maiúsculas)
                    if (!val) {
                        const searchKey = mapping.toLowerCase();
                        if (searchKey.includes('matricula')) val = student.matricula;
                        else if (searchKey.includes('nome')) val = student.nome;
                        else if (searchKey.includes('turma')) val = student.turma;
                    }

                    if (val) renderTextOnPdf(String(val), field, x, y, 0);
                });
            }
        } catch (err) {
            console.error(`Erro crítico ao processar o aluno ${student.nome}:`, err);
        }
    }
    
    pdf.save('crachas-estudantes.pdf');
};
