import { Navigate } from "../shared/navigation";
import { ActionButton, EmptyState, InfoCard, MenuCard, PhoneScreen } from "../shared/ui";

export function HomePage({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <PhoneScreen
      title="대소라이브"
      action={
        <button className="header-link" type="button" onClick={() => onNavigate("settings")}>
          설정
        </button>
      }
      centered
      footer={<ActionButton onClick={() => onNavigate("matching")}>랜덤매칭 시작</ActionButton>}
    >
      <EmptyState>
        대소고 학생들과
        <br />
        가볍게 대화해보세요
      </EmptyState>
    </PhoneScreen>
  );
}

export function SettingsPage({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <PhoneScreen title="설정" footer={<ActionButton onClick={() => onNavigate("home")}>홈으로</ActionButton>}>
      <div className="card-list">
        <MenuCard title="개인정보 안내" description="채팅 데이터와 처리 정보를 확인해요" onClick={() => onNavigate("privacy")} />
        <MenuCard title="문의하기" description="서비스 이용 중 도움이 필요할 때" onClick={() => onNavigate("support")} />
      </div>
    </PhoneScreen>
  );
}

export function PrivacyPage({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <PhoneScreen title="개인정보 안내" footer={<ActionButton onClick={() => onNavigate("settings")}>설정으로</ActionButton>}>
      <div className="card-list">
        <InfoCard accent title="채팅 내용 보호">
          메시지는 서버에 평문으로 저장하지 않습니다.
        </InfoCard>
        <InfoCard title="처리하는 정보">도담도담 계정 식별자, 접속 상태, 신고·제재 기록</InfoCard>
        <InfoCard title="주의사항">실명·전화번호·SNS 계정·주소 등 개인정보를 상대방에게 보내지 마세요.</InfoCard>
      </div>
    </PhoneScreen>
  );
}
